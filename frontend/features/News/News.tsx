import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Input from "@/components/shared/TextInput/TextInput";
import Toast from "@/components/shared/Toast/Toast";
import BlogComposer from "@/features/BlogComposer/BlogComposer";
import NewsFilterSheet, { CATEGORY_OPTIONS } from "@/features/News/NewsFilterSheet";
import { useNews } from "@/hooks/useNews";
import { useCurrentUser } from "@/hooks/useUsers";
import { NewsArticle, NewsCategory } from "@/types/news.types";
import { colors } from "@/constants/colors";
import styles from "./News.styles";

// Remembers the user's last-selected categories across launches — this is
// a standing preference ("only show me sports and world news"), not
// per-session state, so it belongs in AsyncStorage rather than resetting
// to "show everything" every time the app opens.
const SELECTED_CATEGORIES_KEY = "news.selectedCategories";

const CATEGORY_LABELS: Record<NewsCategory, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<NewsCategory, string>;

// One accent color per source (reusing the app's existing macro-bar
// palette from Nutrition — Protein/Carbs/Fat's blue/purple/amber — rather
// than inventing a new one), cycled for any source beyond the three
// currently configured in the backend. Gives News its own visual identity
// (colored accent bars + source pills) instead of the plain white-bordered
// cards used everywhere else in the app (Feed, Leaderboard, etc.).
const SOURCE_ACCENT_COLORS = [
  colors.primaryBlue,
  colors.purple,
  colors.pendingAmber,
  colors.completedGreen,
];
const accentColorForSource = (source: string): string => {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  return SOURCE_ACCENT_COLORS[Math.abs(hash) % SOURCE_ACCENT_COLORS.length];
};

// Same debounce pattern as app/search.tsx's user search — waits for typing
// to pause before hitting the backend, instead of firing a request per
// keystroke.
const useDebouncedValue = (value: string, delayMs: number): string => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
};

// Same "just now / Xm / Xh / Xd / calendar date" pattern used for in-app
// notifications — a real ISO timestamp with a real time-of-day, unlike the
// app's UTC-midnight "date-key" fields, so this deliberately doesn't reuse
// date.utils.ts's formatCalendarDate (that one forces timeZone: "UTC",
// which would show the wrong day for anyone not in UTC).
const formatPublishedAt = (dateStr: string | null): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Splits `text` into plain/matched segments around every case-insensitive
// occurrence of `query` and renders the matches with a highlight style —
// nested <Text> with different styles inline is how RN does "rich text"
// within a single text block, there's no separate rich-text component.
const HighlightedText = ({
  text,
  query,
  style,
  highlightStyle,
  numberOfLines,
}: {
  text: string;
  query: string;
  style?: object;
  highlightStyle?: object;
  numberOfLines?: number;
}) => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const parts = text.split(new RegExp(`(${escapeRegExp(trimmedQuery)})`, "gi"));

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmedQuery.toLowerCase() ? (
          <Text key={index} style={highlightStyle}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
};

const ArticleCard = ({
  article,
  query,
}: {
  article: NewsArticle;
  query: string;
}) => {
  const accentColor = article.isOwnPost
    ? colors.primaryBlue
    : accentColorForSource(article.source);

  const handlePress = () => {
    if (article.type === "blog") {
      router.push(`/blog/${article.id}`);
    } else {
      WebBrowser.openBrowserAsync(article.link);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.sourcePill,
              { backgroundColor: accentColor + "1A" },
            ]}
          >
            <Text style={[styles.sourcePillText, { color: accentColor }]}>
              {article.type === "blog" ? `✍️ ${article.source}` : article.source}
            </Text>
          </View>
          <Text style={styles.timestamp}>
            {formatPublishedAt(article.publishedAt)}
          </Text>
        </View>
        {article.type === "blog" && article.coverImageUrl && (
          <Image
            source={{ uri: article.coverImageUrl }}
            style={styles.coverThumbnail}
            contentFit="cover"
          />
        )}
        <HighlightedText
          text={article.title}
          query={query}
          style={styles.title}
          highlightStyle={styles.highlight}
        />
        {article.summary && (
          <HighlightedText
            text={article.summary}
            query={query}
            style={styles.summary}
            highlightStyle={styles.highlight}
            numberOfLines={3}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const News = () => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [selectedCategories, setSelectedCategories] = useState<NewsCategory[]>([]);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [hasLoadedStoredCategories, setHasLoadedStoredCategories] = useState(false);
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    AsyncStorage.getItem(SELECTED_CATEGORIES_KEY)
      .then((raw) => {
        if (raw) setSelectedCategories(JSON.parse(raw));
      })
      .catch(() => {
        // Worst case this just falls back to "show everything" for this
        // session — not worth surfacing to the user.
      })
      .finally(() => setHasLoadedStoredCategories(true));
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredCategories) return;
    AsyncStorage.setItem(
      SELECTED_CATEGORIES_KEY,
      JSON.stringify(selectedCategories),
    ).catch(() => {});
  }, [selectedCategories, hasLoadedStoredCategories]);

  const {
    data: articles,
    isLoading,
    error,
    refetch,
  } = useNews(
    debouncedQuery.trim() || undefined,
    selectedCategories.length > 0 ? selectedCategories : undefined,
  );
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    await refetch();
    setIsManualRefreshing(false);
  };

  const activeFilterSummary =
    selectedCategories.length === 1
      ? CATEGORY_LABELS[selectedCategories[0]]
      : selectedCategories.length > 1
        ? `${selectedCategories.length} categories`
        : null;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.searchInputWrapper}>
          <Input
            placeholder="Search news"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedCategories.length > 0 && styles.filterButtonActive,
          ]}
          onPress={() => setIsFilterSheetOpen(true)}
        >
          <Feather
            name="filter"
            size={16}
            color={selectedCategories.length > 0 ? "white" : colors.textSecondary}
          />
          {selectedCategories.length > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{selectedCategories.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.writePostButton}
          onPress={() => setIsComposerOpen(true)}
        >
          <Feather name="edit-3" size={16} color="white" />
          <Text style={styles.writePostButtonText}>Write a Post</Text>
        </TouchableOpacity>
      </View>

      {activeFilterSummary && (
        <Text style={styles.filterSummaryText}>
          Showing: {activeFilterSummary}
        </Text>
      )}

      {isLoading && <ActivityIndicator style={{ marginTop: 40 }} />}

      {!isLoading && (
        <FlatList
          data={articles ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ArticleCard article={item} query={debouncedQuery} />
          )}
          contentContainerStyle={styles.listContent}
          refreshing={isManualRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {error
                ? "Couldn't load news right now. Pull down to try again."
                : debouncedQuery.trim()
                  ? `No articles matching "${debouncedQuery.trim()}".`
                  : selectedCategories.includes("local") && !currentUser?.city
                    ? "Add your city in Profile to see local news."
                    : "No articles right now."}
            </Text>
          }
        />
      )}

      <NewsFilterSheet
        visible={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        selected={selectedCategories}
        onChange={setSelectedCategories}
        hasCity={!!currentUser?.city}
      />

      <BlogComposer
        visible={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onPosted={() => setToastMessage("Post published")}
      />

      <Toast
        visible={!!toastMessage}
        message={toastMessage ?? ""}
        onHide={() => setToastMessage(null)}
      />
    </View>
  );
};

export default News;
