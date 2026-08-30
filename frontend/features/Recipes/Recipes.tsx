import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import Feather from "@expo/vector-icons/Feather";
import Input from "@/components/shared/TextInput/TextInput";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import {
  useSavedRecipes,
  useExtractRecipeFromLink,
  useSaveRecipe,
  useLogSavedRecipeToMeal,
} from "@/hooks/useSavedRecipes";
import {
  SavedRecipe,
  SavedRecipeIngredient,
  ExtractedRecipe,
} from "@/types/savedRecipes.types";
import { MEAL_TYPES, MEAL_TYPE_LABELS, MealType } from "@/types/nutrition.types";
import { toDateKey } from "@/lib/utils/date.utils";
import { colors } from "@/constants/colors";
import styles from "./Recipes.styles";

const useDebouncedValue = (value: string, delayMs: number): string => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
};

const formatIngredientLine = (ingredient: SavedRecipeIngredient): string =>
  [ingredient.quantity, ingredient.unit, ingredient.name]
    .filter((part) => part !== null && part !== "")
    .join(" ");

const SavedRecipeDetailModal = ({
  recipe,
  onClose,
}: {
  recipe: SavedRecipe | null;
  onClose: () => void;
}) => {
  const { mutate: logToMeal, isPending: isLoggingMeal } = useLogSavedRecipeToMeal();
  const [pendingMealType, setPendingMealType] = useState<MealType | null>(null);
  const [loggedMealType, setLoggedMealType] = useState<MealType | null>(null);

  // A different recipe being opened (or this one being reopened) should
  // clear any "Added to ..." feedback left over from the last one.
  useEffect(() => {
    setLoggedMealType(null);
  }, [recipe?.id]);

  const handleAddToMeal = (mealType: MealType) => {
    if (!recipe) return;
    setPendingMealType(mealType);
    setLoggedMealType(null);
    logToMeal(
      { recipeId: recipe.id, mealType, date: toDateKey(new Date()) },
      {
        onSuccess: () => {
          setPendingMealType(null);
          setLoggedMealType(mealType);
        },
        onError: () => setPendingMealType(null),
      },
    );
  };

  return (
    <Modal visible={!!recipe} onClose={onClose} size="large" title={recipe?.title}>
      {recipe && (
        <View>
          {recipe.thumbnailUrl && (
            <Image
              source={{ uri: recipe.thumbnailUrl }}
              style={styles.detailImage}
              contentFit="cover"
            />
          )}

          {(recipe.sourceUrl || recipe.calories !== null) && (
            <View style={styles.detailMetaRow}>
              {recipe.sourceUrl && (
                <TouchableOpacity
                  style={[styles.metaPill, styles.metaPillLink]}
                  onPress={() => Linking.openURL(recipe.sourceUrl!)}
                >
                  <Feather name="external-link" size={13} color={colors.primaryBlue} />
                  <Text style={[styles.metaPillText, styles.metaPillTextLink]}>
                    {recipe.sourcePlatform === "tiktok"
                      ? "View on TikTok"
                      : recipe.sourcePlatform === "youtube"
                        ? "View on YouTube"
                        : "View Source"}
                  </Text>
                </TouchableOpacity>
              )}
              {recipe.calories !== null && (
                <View style={styles.metaPill}>
                  <Feather name="zap" size={13} color={colors.textSecondary} />
                  <Text style={styles.metaPillText}>
                    ~{recipe.calories} cal / serving
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text style={[styles.sectionHeading, styles.sectionHeadingTight]}>
            Add to Today's Log
          </Text>
          <View style={styles.mealButtonRow}>
            {MEAL_TYPES.map((mealType) => (
              <TouchableOpacity
                key={mealType}
                style={styles.mealButton}
                onPress={() => handleAddToMeal(mealType)}
                disabled={isLoggingMeal}
              >
                {pendingMealType === mealType ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <>
                    <Feather name="plus" size={11} color={colors.textSecondary} />
                    <Text style={styles.mealButtonText}>{MEAL_TYPE_LABELS[mealType]}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
          {loggedMealType && (
            <Text style={styles.mealAddedText}>
              Added to {MEAL_TYPE_LABELS[loggedMealType]} — macros are an AI estimate
              for one serving. Edit them from the Nutrition tab if they're off.
            </Text>
          )}

          <Text style={styles.sectionHeading}>Ingredients</Text>
          {recipe.ingredients.map((ingredient, index) => (
            <View key={index} style={styles.savedIngredientRow}>
              <View style={styles.savedIngredientBullet} />
              <Text style={styles.savedIngredientText}>
                {formatIngredientLine(ingredient)}
              </Text>
            </View>
          ))}

          {recipe.steps.length > 0 && (
            <>
              <Text style={styles.sectionHeading}>Instructions</Text>
              {recipe.steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </Modal>
  );
};

interface EditableIngredient {
  name: string;
  quantity: string;
  unit: string;
}

const toEditableIngredients = (
  ingredients: SavedRecipeIngredient[],
): EditableIngredient[] =>
  ingredients.map((ingredient) => ({
    name: ingredient.name,
    quantity: ingredient.quantity != null ? String(ingredient.quantity) : "",
    unit: ingredient.unit ?? "",
  }));

// The review-before-save step: nothing from extractRecipeFromLink is
// persisted until the user edits (optionally) and taps Save here —
// Cancel (the modal's own close button) discards it entirely.
const RecipeReviewModal = ({
  extracted,
  onClose,
  onSaved,
}: {
  extracted: ExtractedRecipe | null;
  onClose: () => void;
  onSaved: (recipe: SavedRecipe) => void;
}) => {
  const { mutate: save, isPending: isSaving } = useSaveRecipe();
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState<EditableIngredient[]>([]);
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!extracted) return;
    setTitle(extracted.title);
    setIngredients(toEditableIngredients(extracted.ingredients));
    setSteps(extracted.steps);
  }, [extracted]);

  const updateIngredient = (index: number, patch: Partial<EditableIngredient>) => {
    setIngredients((prev) =>
      prev.map((ingredient, i) => (i === index ? { ...ingredient, ...patch } : ingredient)),
    );
  };
  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };
  const addIngredient = () => {
    setIngredients((prev) => [...prev, { name: "", quantity: "", unit: "" }]);
  };

  const updateStep = (index: number, text: string) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? text : step)));
  };
  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };
  const addStep = () => {
    setSteps((prev) => [...prev, ""]);
  };

  const handleSave = () => {
    if (!extracted) return;
    save(
      {
        title: title.trim() || "Untitled Recipe",
        ingredients: ingredients
          .filter((ingredient) => ingredient.name.trim())
          .map((ingredient) => ({
            name: ingredient.name.trim(),
            quantity: ingredient.quantity.trim()
              ? parseFloat(ingredient.quantity) || null
              : null,
            unit: ingredient.unit.trim() || null,
          })),
        steps: steps.map((step) => step.trim()).filter(Boolean),
        sourcePlatform: extracted.sourcePlatform,
        sourceUrl: extracted.sourceUrl,
        thumbnailUrl: extracted.thumbnailUrl,
      },
      { onSuccess: onSaved },
    );
  };

  return (
    <Modal
      visible={!!extracted}
      onClose={onClose}
      size="large"
      title="Review Recipe"
      headerAction={
        <Button
          title={isSaving ? "Saving..." : "Save"}
          onPress={handleSave}
          disabled={isSaving}
          style={styles.reviewSaveButton}
          textStyle={styles.reviewSaveButtonText}
        />
      }
    >
      {extracted && (
        <View>
          {extracted.thumbnailUrl && (
            <Image
              source={{ uri: extracted.thumbnailUrl }}
              style={styles.detailImage}
              contentFit="cover"
            />
          )}

          <Text style={styles.fieldLabel}>Title</Text>
          <Input value={title} onChangeText={setTitle} placeholder="Recipe title" />

          <Text style={styles.sectionHeading}>Ingredients</Text>
          {ingredients.map((ingredient, index) => (
            <View key={index} style={styles.editableIngredientRow}>
              <View style={styles.editableIngredientFields}>
                <View style={styles.editableQtyWrapper}>
                  <Input
                    value={ingredient.quantity}
                    onChangeText={(text) => updateIngredient(index, { quantity: text })}
                    placeholder="qty"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.editableUnitWrapper}>
                  <Input
                    value={ingredient.unit}
                    onChangeText={(text) => updateIngredient(index, { unit: text })}
                    placeholder="unit"
                  />
                </View>
                <View style={styles.editableNameWrapper}>
                  <Input
                    value={ingredient.name}
                    onChangeText={(text) => updateIngredient(index, { name: text })}
                    placeholder="ingredient"
                  />
                </View>
              </View>
              <TouchableOpacity onPress={() => removeIngredient(index)} hitSlop={8}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addIngredient} style={styles.addRowButton}>
            <Feather name="plus" size={14} color={colors.primaryBlue} />
            <Text style={styles.addRowText}>Add Ingredient</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeading}>Instructions</Text>
          {steps.map((step, index) => (
            <View key={index} style={styles.editableStepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <TextInput
                style={styles.editableStepInput}
                value={step}
                onChangeText={(text) => updateStep(index, text)}
                placeholder={`Step ${index + 1}`}
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <TouchableOpacity
                onPress={() => removeStep(index)}
                hitSlop={8}
                style={styles.editableStepRemoveButton}
              >
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addStep} style={styles.addRowButton}>
            <Feather name="plus" size={14} color={colors.primaryBlue} />
            <Text style={styles.addRowText}>Add Step</Text>
          </TouchableOpacity>
        </View>
      )}
    </Modal>
  );
};

const RecipeSavedModal = ({
  recipe,
  onClose,
  onViewRecipe,
}: {
  recipe: SavedRecipe | null;
  onClose: () => void;
  onViewRecipe: () => void;
}) => (
  <Modal visible={!!recipe} onClose={onClose}>
    <View style={styles.successContainer}>
      <View style={styles.successIconRing}>
        <Feather name="check" size={28} color={colors.primaryBlue} />
      </View>
      <Text style={styles.successTitle}>Recipe Saved!</Text>
      <Text style={styles.successSubtitle}>
        "{recipe?.title}" is now saved to your recipes.
      </Text>
      <View style={styles.successButtonRow}>
        <Button
          title="Done"
          variant="outline"
          onPress={onClose}
          style={styles.successButton}
        />
        <Button title="View Recipe" onPress={onViewRecipe} style={styles.successButton} />
      </View>
    </View>
  </Modal>
);

interface RecipesProps {
  // Set once when the app is opened via another app's share sheet (see
  // app/_layout.tsx + app/(tabs)/index.tsx) — triggers the same import
  // flow as pasting the link in manually, just without the user having to
  // paste it themselves.
  sharedUrl?: string;
  onConsumedSharedUrl?: () => void;
}

const Recipes = ({ sharedUrl, onConsumedSharedUrl }: RecipesProps) => {
  const [activeTab, setActiveTab] = useState<"saved" | "discover">("saved");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importStatusIsError, setImportStatusIsError] = useState(false);
  const { data: savedRecipes } = useSavedRecipes();
  const { mutate: extractRecipe, isPending: isExtracting } = useExtractRecipeFromLink();
  const [selectedSavedRecipe, setSelectedSavedRecipe] = useState<SavedRecipe | null>(
    null,
  );
  const [recipeToReview, setRecipeToReview] = useState<ExtractedRecipe | null>(null);
  const [justSavedRecipe, setJustSavedRecipe] = useState<SavedRecipe | null>(null);

  // The only way a URL reaches this screen now is via the OS share sheet
  // (see app/_layout.tsx + app/(tabs)/index.tsx) — no in-app paste box,
  // since the share extension covers that flow. Extraction alone never
  // saves anything — it just opens the review modal below for the user to
  // confirm (and optionally edit) before RecipeReviewModal's Save commits it.
  const handleExtract = (url: string) => {
    setImportStatus(null);
    extractRecipe(url, {
      onSuccess: (outcome) => {
        if (outcome.status === "ready_to_review") {
          setImportStatus(null);
          setRecipeToReview(outcome.recipe);
        } else if (outcome.status === "already_saved") {
          setImportStatusIsError(false);
          setImportStatus("This recipe's already been imported.");
          setActiveTab("saved");
          setSelectedSavedRecipe(outcome.recipe);
        } else {
          setImportStatusIsError(false);
          setImportStatus(
            "Couldn't find a real recipe in that video's caption.",
          );
        }
      },
      onError: (error: unknown) => {
        // apiClient's response interceptor (lib/api/client.ts) already
        // normalizes every rejected request into {status, message} —
        // message is already the backend's own error text when the
        // server responded at all, or a generic network message
        // otherwise. No need (and no ability) to reach into a raw
        // AxiosError shape here.
        const normalized = error as { status?: number; message?: string };
        const message = normalized?.message ?? "Couldn't import that link — try again.";
        setImportStatusIsError(true);
        setImportStatus(message);
      },
    });
  };

  // index.tsx clears sharedUrl after handing it off via
  // router.setParams({ sharedRecipeUrl: undefined }) — Expo Router doesn't
  // delete the param for that, it stringifies it to the literal text
  // "undefined" (confirmed via logging: the very next render of this
  // effect gets sharedUrl === "undefined", a few ms after the real URL),
  // which is truthy and would otherwise be treated as a second share.
  // Tracking the last URL actually handled AND rejecting that literal
  // string makes this effect a true run-once-per-real-share.
  const handledSharedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      !sharedUrl ||
      sharedUrl === "undefined" ||
      sharedUrl === handledSharedUrlRef.current
    ) {
      return;
    }
    handledSharedUrlRef.current = sharedUrl;
    handleExtract(sharedUrl);
    onConsumedSharedUrl?.();
    // handleExtract/onConsumedSharedUrl are recreated every render (they
    // close over other state) — only sharedUrl itself should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedUrl]);

  // Client-side only — Spoonacular-backed browse/search (useRecipeSearch)
  // is disabled for now (its API kept failing), so this screen shows just
  // the community's imported recipes, filtered by title locally rather
  // than through a remote search call.
  const filteredSavedRecipes = (savedRecipes ?? []).filter((recipe) =>
    recipe.title.toLowerCase().includes(debouncedQuery.trim().toLowerCase()),
  );

  const renderSavedRecipe = (recipe: SavedRecipe) => (
    <TouchableOpacity
      key={recipe.id}
      style={styles.card}
      onPress={() => setSelectedSavedRecipe(recipe)}
      activeOpacity={0.85}
    >
      {recipe.thumbnailUrl ? (
        <Image
          source={{ uri: recipe.thumbnailUrl }}
          style={styles.cardImage}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.cardThumbnailPlaceholder]}>
          <Feather name="video" size={24} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {recipe.title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {(isExtracting || importStatus) && (
        <View
          style={[
            styles.importSection,
            isExtracting || !importStatusIsError
              ? styles.importSectionInfo
              : styles.importSectionError,
          ]}
        >
          {isExtracting ? (
            <>
              <ActivityIndicator size="small" color={colors.primaryBlue} />
              <Text style={[styles.importStatusText, styles.importStatusInfo]}>
                Importing recipe...
              </Text>
            </>
          ) : (
            <Text
              style={[
                styles.importStatusText,
                importStatusIsError ? styles.importStatusError : styles.importStatusInfo,
              ]}
            >
              {importStatus}
            </Text>
          )}
        </View>
      )}

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "discover" && styles.tabButtonActive]}
          onPress={() => setActiveTab("discover")}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "discover" && styles.tabButtonTextActive,
            ]}
          >
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "saved" && styles.tabButtonActive]}
          onPress={() => setActiveTab("saved")}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "saved" && styles.tabButtonTextActive,
            ]}
          >
            Saved
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "saved" ? (
        <>
          <View style={styles.searchContainer}>
            <Input
              placeholder="Search your saved recipes"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
          >
            {filteredSavedRecipes.length === 0 ? (
              <Text style={styles.hintText}>
                {debouncedQuery.trim()
                  ? `No saved recipes match "${debouncedQuery.trim()}"`
                  : "No recipes saved yet — share a TikTok or YouTube link into DryveFit to import one."}
              </Text>
            ) : (
              <View style={styles.grid}>{filteredSavedRecipes.map(renderSavedRecipe)}</View>
            )}
          </ScrollView>
        </>
      ) : (
        <Text style={styles.hintText}>
          Recipe search isn't set up yet — check back soon.
        </Text>
      )}

      <SavedRecipeDetailModal
        recipe={selectedSavedRecipe}
        onClose={() => setSelectedSavedRecipe(null)}
      />
      <RecipeReviewModal
        extracted={recipeToReview}
        onClose={() => setRecipeToReview(null)}
        onSaved={(recipe) => {
          setRecipeToReview(null);
          setJustSavedRecipe(recipe);
          setActiveTab("saved");
        }}
      />
      <RecipeSavedModal
        recipe={justSavedRecipe}
        onClose={() => setJustSavedRecipe(null)}
        onViewRecipe={() => {
          setSelectedSavedRecipe(justSavedRecipe);
          setJustSavedRecipe(null);
        }}
      />
    </View>
  );
};

export default Recipes;
