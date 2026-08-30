import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import Feather from "@expo/vector-icons/Feather";
import Input from "@/components/shared/TextInput/TextInput";
import Modal from "@/components/shared/Modal/Modal";
import {
  useRecipeSearch,
  useRecipeDetail,
  useRecipePriceBreakdown,
} from "@/hooks/useRecipes";
import { useSavedRecipes, useImportRecipeFromLink } from "@/hooks/useSavedRecipes";
import { RecipeSearchResult } from "@/types/recipes.types";
import { SavedRecipe, SavedRecipeIngredient } from "@/types/savedRecipes.types";
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

const formatUsd = (amount: number): string => `$${amount.toFixed(2)}`;

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
}) => (
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

        {recipe.importedByUsername && (
          <Text style={styles.attributionText}>
            Imported by @{recipe.importedByUsername}
          </Text>
        )}

        {recipe.sourceUrl && (
          <View style={styles.detailMetaRow}>
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
          </View>
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

const RecipeDetailModal = ({
  recipeId,
  onClose,
}: {
  recipeId: number | null;
  onClose: () => void;
}) => {
  const { data: recipe, isLoading, isError } = useRecipeDetail(recipeId);
  const { data: priceBreakdown, isLoading: isPriceLoading } =
    useRecipePriceBreakdown(recipeId);

  return (
    <Modal
      visible={recipeId != null}
      onClose={onClose}
      size="large"
      title={recipe?.title}
    >
      {isLoading ? (
        <ActivityIndicator style={{ paddingVertical: 40 }} />
      ) : isError || !recipe ? (
        <View style={styles.errorState}>
          <Text style={styles.hintText}>Couldn't load this recipe.</Text>
        </View>
      ) : (
        <View>
          {recipe.imageUrl && (
            <Image
              source={{ uri: recipe.imageUrl }}
              style={styles.detailImage}
              contentFit="cover"
            />
          )}

          <View style={styles.detailMetaRow}>
            <View style={styles.metaPill}>
              <Feather name="clock" size={13} color={colors.textSecondary} />
              <Text style={styles.metaPillText}>
                {recipe.readyInMinutes} min
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Feather name="users" size={13} color={colors.textSecondary} />
              <Text style={styles.metaPillText}>
                {recipe.servings} servings
              </Text>
            </View>
            {recipe.sourceUrl && (
              <TouchableOpacity
                style={[styles.metaPill, styles.metaPillLink]}
                onPress={() => Linking.openURL(recipe.sourceUrl!)}
              >
                <Feather name="external-link" size={13} color={colors.primaryBlue} />
                <Text style={[styles.metaPillText, styles.metaPillTextLink]}>
                  Source
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.sectionHeading}>Ingredients</Text>
          {isPriceLoading ? (
            <ActivityIndicator style={styles.priceLoading} />
          ) : priceBreakdown ? (
            // Sourced entirely from the price-breakdown endpoint rather than
            // merged with the recipe-detail endpoint's ingredient list —
            // Spoonacular normalizes ingredient names differently between
            // the two (e.g. "onion" here vs. "yellow diced onion" there),
            // so matching them up by name would silently drop most prices.
            priceBreakdown.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientRow}>
                {ingredient.imageUrl && (
                  <Image
                    source={{ uri: ingredient.imageUrl }}
                    style={styles.ingredientImage}
                    contentFit="cover"
                  />
                )}
                <View style={styles.ingredientTextGroup}>
                  <Text style={styles.ingredientName} numberOfLines={1}>
                    {ingredient.name}
                  </Text>
                  <Text style={styles.ingredientAmount}>
                    {ingredient.amount} {ingredient.unit}
                  </Text>
                </View>
                <View style={styles.ingredientPriceBadge}>
                  <Text style={styles.ingredientPrice}>
                    {formatUsd(ingredient.priceUsd)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            // Price breakdown failed to load (e.g. rate-limited) — still
            // show the ingredient list, just without prices.
            recipe.ingredients.map((ingredient) => (
              <View key={ingredient.id} style={styles.ingredientRow}>
                {ingredient.imageUrl && (
                  <Image
                    source={{ uri: ingredient.imageUrl }}
                    style={styles.ingredientImage}
                    contentFit="cover"
                  />
                )}
                <View style={styles.ingredientTextGroup}>
                  <Text style={styles.ingredientName} numberOfLines={1}>
                    {ingredient.name}
                  </Text>
                  <Text style={styles.ingredientAmount}>
                    {ingredient.amount} {ingredient.unit}
                  </Text>
                </View>
              </View>
            ))
          )}

          {priceBreakdown && (
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Cost</Text>
              <View>
                <Text style={styles.totalValue}>
                  {formatUsd(priceBreakdown.totalCostUsd)}
                </Text>
                <Text style={styles.totalPerServing}>
                  {formatUsd(priceBreakdown.totalCostPerServingUsd)}/serving
                </Text>
              </View>
            </View>
          )}

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

interface RecipesProps {
  // Set once when the app is opened via another app's share sheet (see
  // app/_layout.tsx + app/(tabs)/index.tsx) — triggers the same import
  // flow as pasting the link in manually, just without the user having to
  // paste it themselves.
  sharedUrl?: string;
  onConsumedSharedUrl?: () => void;
}

const Recipes = ({ sharedUrl, onConsumedSharedUrl }: RecipesProps) => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const isSearching = debouncedQuery.trim().length > 1;
  const { data: results, isLoading, isError } = useRecipeSearch(debouncedQuery, {});
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importStatusIsError, setImportStatusIsError] = useState(false);
  const { data: savedRecipes } = useSavedRecipes();
  const { mutate: importRecipe, isPending: isImporting } = useImportRecipeFromLink();
  const [selectedSavedRecipe, setSelectedSavedRecipe] = useState<SavedRecipe | null>(
    null,
  );

  // The only way a URL reaches this screen now is via the OS share sheet
  // (see app/_layout.tsx + app/(tabs)/index.tsx) — no in-app paste box,
  // since the share extension covers that flow.
  const handleImport = (url: string) => {
    setImportStatus(null);
    importRecipe(url, {
      onSuccess: (outcome) => {
        if (outcome.status === "saved") {
          setImportStatus(null);
          setSelectedSavedRecipe(outcome.recipe);
        } else {
          setImportStatusIsError(false);
          setImportStatus(
            "Couldn't find a real recipe in that video's caption.",
          );
        }
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Couldn't import that link — try again.";
        setImportStatusIsError(true);
        setImportStatus(message);
      },
    });
  };

  useEffect(() => {
    if (!sharedUrl) return;
    handleImport(sharedUrl);
    onConsumedSharedUrl?.();
    // handleImport/onConsumedSharedUrl are recreated every render (they
    // close over other state) — only sharedUrl itself should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedUrl]);

  const renderHit = (hit: RecipeSearchResult) => (
    <TouchableOpacity
      key={hit.id}
      style={styles.card}
      onPress={() => setSelectedRecipeId(hit.id)}
      activeOpacity={0.85}
    >
      <Image
        source={hit.imageUrl ? { uri: hit.imageUrl } : undefined}
        style={styles.cardImage}
        contentFit="cover"
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {hit.title}
        </Text>
      </View>
    </TouchableOpacity>
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
        {recipe.importedByUsername && (
          <Text style={styles.cardAttribution} numberOfLines={1}>
            @{recipe.importedByUsername}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {(isImporting || importStatus) && (
        <View style={styles.importSection}>
          {isImporting ? (
            <Text style={[styles.importStatusText, styles.importStatusInfo]}>
              Importing recipe...
            </Text>
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

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search for a recipe"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : isError ? (
        <Text style={styles.hintText}>
          Recipe search isn't set up yet — check back soon.
        </Text>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        >
          {!isSearching && savedRecipes && savedRecipes.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Imported by the Community</Text>
              <View style={styles.grid}>{savedRecipes.map(renderSavedRecipe)}</View>
            </>
          )}

          <Text style={styles.sectionLabel}>
            {isSearching ? `Results for "${debouncedQuery}"` : "Popular Recipes"}
          </Text>
          {results && results.length === 0 ? (
            <Text style={styles.hintText}>
              {isSearching ? `No results for "${debouncedQuery}"` : "Nothing to show right now."}
            </Text>
          ) : (
            <View style={styles.grid}>{results?.map(renderHit)}</View>
          )}
        </ScrollView>
      )}

      <RecipeDetailModal
        recipeId={selectedRecipeId}
        onClose={() => setSelectedRecipeId(null)}
      />
      <SavedRecipeDetailModal
        recipe={selectedSavedRecipe}
        onClose={() => setSelectedSavedRecipe(null)}
      />
    </View>
  );
};

export default Recipes;
