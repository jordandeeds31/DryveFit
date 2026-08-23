import Parser from "rss-parser";
import prisma from "../../lib/prisma";
import { getBlogPosts } from "../blog/blog.service";

export type NewsCategory =
  | "top_stories"
  | "sports"
  | "politics"
  | "world"
  | "crime"
  | "local"
  | "fitness_nutrition";

// Each of these publishes a real, actively-updated RSS feed — verified by
// hand (curl + item count), both that the feed itself works and that it's
// still being posted to. Twitter/X, Instagram, and Reddit were deliberately
// left out: X's free API tier has no read access and paid tiers start
// around $100/mo, Instagram has no public API for browsing arbitrary posts,
// and Reddit's old unauthenticated JSON endpoints (reddit.com/r/x/.json)
// now 403 everything without a registered OAuth app. Scraping any of the
// three directly was ruled out for the same reason raw HTML scraping was
// already ruled out below — fragile and against their Terms of Service,
// where a real API/feed is the sanctioned way in.
//
// Politico's RSS (https://www.politico.com/rss/politicopicks.xml) 403s
// automated requests despite looking legitimate at a glance — left out for
// the same "unreliable in practice" reason BarBend/NerdFitness/etc. were
// left out of the original fitness list below.
const FEED_SOURCES: { name: string; url: string; category: NewsCategory }[] = [
  // Fitness & Nutrition — the original set. BarBend's /feed/ 404s and
  // NerdFitness/TrainHeroic/EatingWell block automated requests with a 403
  // despite looking legitimate at a glance; Breaking Muscle, StrongLifts,
  // and Juggernaut Training Systems all have working feeds that simply
  // haven't been posted to in 1-3 years, so they'd sit in this list
  // forever contributing nothing; examine.com's feed rate-limited a single
  // test request (429), too unreliable to depend on.
  { name: "Muscle & Fitness", url: "https://www.muscleandfitness.com/feed/", category: "fitness_nutrition" },
  { name: "Stronger by Science", url: "https://www.strongerbyscience.com/feed/", category: "fitness_nutrition" },
  { name: "Precision Nutrition", url: "https://www.precisionnutrition.com/blog/feed", category: "fitness_nutrition" },
  { name: "Nutrition Stripped", url: "https://nutritionstripped.com/feed/", category: "fitness_nutrition" },
  { name: "Harvard Nutrition Source", url: "https://nutritionsource.hsph.harvard.edu/feed/", category: "fitness_nutrition" },

  // Sports
  { name: "ESPN", url: "https://www.espn.com/espn/rss/news", category: "sports" },
  { name: "ESPN NFL", url: "https://www.espn.com/espn/rss/nfl/news", category: "sports" },
  { name: "CBS Sports", url: "https://www.cbssports.com/rss/headlines", category: "sports" },
  { name: "Sporting News", url: "https://www.sportingnews.com/us/rss", category: "sports" },

  // Top Stories / general
  { name: "BBC News", url: "http://feeds.bbci.co.uk/news/rss.xml", category: "top_stories" },
  { name: "NPR", url: "https://feeds.npr.org/1001/rss.xml", category: "top_stories" },

  // Politics & Government
  { name: "BBC Politics", url: "http://feeds.bbci.co.uk/news/politics/rss.xml", category: "politics" },
  { name: "NPR Politics", url: "https://feeds.npr.org/1014/rss.xml", category: "politics" },
  { name: "The Guardian", url: "https://www.theguardian.com/politics/rss", category: "politics" },
  { name: "The Hill", url: "https://thehill.com/homenews/feed/", category: "politics" },

  // World / Geopolitics
  { name: "BBC World", url: "http://feeds.bbci.co.uk/news/world/rss.xml", category: "world" },
  { name: "NPR World", url: "https://feeds.npr.org/1004/rss.xml", category: "world" },
  { name: "The Guardian", url: "https://www.theguardian.com/world/rss", category: "world" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "world" },

  // Crime — Google News' own search-results RSS output (not scraped HTML,
  // a real feed Google publishes), since no mainstream outlet runs a
  // dedicated national crime-only feed.
  {
    name: "Google News",
    url: "https://news.google.com/rss/search?q=crime&hl=en-US&gl=US&ceid=US:en",
    category: "crime",
  },
];

const MAX_ARTICLES = 60;
const CACHE_TTL_MS = 15 * 60 * 1000;

export interface NewsArticle {
  type: "rss" | "blog";
  // rss: not a real id, the link itself (unique enough to key off of).
  // blog: the actual BlogPost id, used to fetch the full post/navigate to
  // it in-app rather than opening an external browser.
  id: string;
  title: string;
  // rss: the external article URL, opened in an in-app browser.
  // blog: empty — there's nothing external to open, the client navigates
  // to the blog post detail screen by id instead.
  link: string;
  // rss: the blog/publication name. blog: the author's username (or a
  // fallback if they haven't set one).
  source: string;
  category: NewsCategory;
  publishedAt: string | null;
  summary: string | null;
  coverImageUrl?: string | null;
  isOwnPost?: boolean;
}

let rssCache: { articles: NewsArticle[]; fetchedAt: number } | null = null;

// Local news is personalized per viewer (their saved city), so it can't
// share the single global rssCache above — keyed by city rather than by
// user, since two users in the same city should hit the same cached fetch.
// Unlike rssCache (one fixed slot, always overwritten), this grows one new
// entry per DISTINCT city ever queried — now that the city list is
// worldwide rather than ~32k US places, that's effectively unbounded on a
// long-lived process. LOCAL_CACHE_MAX_ENTRIES below caps it; without a
// cap this was a real, slow memory leak.
const localCache = new Map<string, { articles: NewsArticle[]; fetchedAt: number }>();
const LOCAL_CACHE_MAX_ENTRIES = 500;

// Maps preserve insertion order, and re-`set`ting an existing key moves it
// to the end — so the first key is always the least-recently-(re)used one.
// Deleting it on overflow is a cheap, good-enough LRU approximation
// without pulling in a real LRU cache dependency for what's a soft cap.
const setLocalCache = (
  city: string,
  value: { articles: NewsArticle[]; fetchedAt: number },
): void => {
  localCache.delete(city);
  if (localCache.size >= LOCAL_CACHE_MAX_ENTRIES) {
    const oldestKey = localCache.keys().next().value;
    if (oldestKey !== undefined) localCache.delete(oldestKey);
  }
  localCache.set(city, value);
};

const parser = new Parser();

// WordPress (which every fitness/nutrition RSS source runs on) always
// appends "The post <a>Title</a> appeared first on <a>Site</a>." to the
// plain description — useful in an RSS reader that credits the source
// itself, redundant here since the card already shows the source name, so
// it's stripped along with the surrounding HTML tags to leave a clean
// plain-text summary.
const cleanSummary = (html: string | undefined): string | null => {
  if (!html) return null;
  const withoutAppearedFirstOn = html.replace(/The post .*appeared first on .*\.?\s*$/is, "");
  const plainText = withoutAppearedFirstOn
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plainText.length > 0 ? plainText : null;
};

const fetchFeed = async (source: {
  name: string;
  url: string;
  category: NewsCategory;
}): Promise<NewsArticle[]> => {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items ?? [])
      .filter((item) => !!item.title && !!item.link)
      .map((item) => ({
        type: "rss" as const,
        id: item.link!,
        title: item.title!,
        link: item.link!,
        source: source.name,
        category: source.category,
        publishedAt: item.isoDate ?? item.pubDate ?? null,
        summary: cleanSummary(item.contentSnippet ?? item.content),
      }));
  } catch (err) {
    // One dead/slow feed shouldn't take down the whole request — logged,
    // not thrown, same "never fail the whole request over one bad
    // dependency" pattern used elsewhere (e.g. DM push notifications).
    console.warn(`Failed to fetch news feed "${source.name}":`, err);
    return [];
  }
};

const sortByRecency = (articles: NewsArticle[]): NewsArticle[] =>
  [...articles].sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });

// Several sources overlap on the same story with the same link — e.g. an
// NFL story pulled by both the general ESPN feed and the ESPN NFL feed —
// which without this would reach the client as two articles sharing one
// `id`, breaking FlatList's keyExtractor (React logs a duplicate-key
// warning and can misrender/duplicate rows). Keeps whichever copy was
// seen first; which source/category "wins" for an overlapping story
// doesn't matter for display.
const dedupeById = (articles: NewsArticle[]): NewsArticle[] => {
  const seen = new Set<string>();
  return articles.filter((article) => {
    if (seen.has(article.id)) return false;
    seen.add(article.id);
    return true;
  });
};

// Cached uncapped and unfiltered — a keyword search should be able to match
// against everything actually fetched, not just whatever made the top-cut.
// Only the RSS side is cached — user blog posts are a fast local DB query
// and should show up immediately after posting, not wait up to 15 minutes.
const getCachedRssArticles = async (): Promise<NewsArticle[]> => {
  if (rssCache && Date.now() - rssCache.fetchedAt < CACHE_TTL_MS) {
    return rssCache.articles;
  }

  const results = await Promise.all(FEED_SOURCES.map(fetchFeed));
  const articles = dedupeById(sortByRecency(results.flat()));

  rssCache = { articles, fetchedAt: Date.now() };
  return articles;
};

const getLocalArticlesForCity = async (city: string): Promise<NewsArticle[]> => {
  const cached = localCache.get(city);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.articles;
  }

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${city} news`)}&hl=en-US&gl=US&ceid=US:en`;
  const articles = await fetchFeed({ name: `${city} Local`, url, category: "local" });
  setLocalCache(city, { articles, fetchedAt: Date.now() });
  return articles;
};

// Returns [] rather than throwing when the viewer has no city set — local
// news is opt-in by profile completeness, not a hard requirement, same
// spirit as the leaderboard's separate username/city setup banners.
const getLocalArticlesForViewer = async (viewerId: string): Promise<NewsArticle[]> => {
  const user = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { city: true },
  });
  if (!user?.city) return [];
  return getLocalArticlesForCity(user.city);
};

const MAX_SUMMARY_LENGTH = 200;

const toBlogNewsArticle = (
  post: Awaited<ReturnType<typeof getBlogPosts>>[number],
): NewsArticle => ({
  type: "blog",
  id: post.id,
  title: post.title,
  link: "",
  source: post.author.username ?? "DryveFit user",
  // User blog posts are all fitness/nutrition content in practice (the
  // composer has no category picker), so filtering to that category is
  // the closest match to "show me app content" rather than inventing a
  // separate always-shown bucket that'd behave inconsistently with the
  // rest of the filter.
  category: "fitness_nutrition",
  publishedAt: post.createdAt.toISOString(),
  summary:
    post.body.length > MAX_SUMMARY_LENGTH
      ? `${post.body.slice(0, MAX_SUMMARY_LENGTH).trim()}…`
      : post.body,
  coverImageUrl: post.coverImageUrl,
  isOwnPost: post.isOwnPost,
});

export const getNewsFeed = async (
  viewerId: string,
  query?: string,
  categories?: NewsCategory[],
): Promise<NewsArticle[]> => {
  // Local news needs its own per-viewer fetch (keyed on their city), so it's
  // only ever done when relevant — either no filter is applied (show
  // everything) or "local" is explicitly one of the selected categories.
  const wantsLocal = !categories || categories.length === 0 || categories.includes("local");

  const [rssArticles, blogPosts, localArticles] = await Promise.all([
    getCachedRssArticles(),
    getBlogPosts(viewerId),
    wantsLocal ? getLocalArticlesForViewer(viewerId) : Promise.resolve([]),
  ]);

  // rssArticles is already deduped internally, but the crime feed and a
  // city's local feed are both separate Google News search queries that
  // can genuinely surface the exact same story/link — deduped again here
  // now that everything's combined.
  const allArticles = dedupeById(
    sortByRecency([
      ...rssArticles,
      ...localArticles,
      ...blogPosts.map(toBlogNewsArticle),
    ]),
  );

  const categoryFiltered =
    categories && categories.length > 0
      ? allArticles.filter((article) => categories.includes(article.category))
      : allArticles;

  const trimmedQuery = query?.trim().toLowerCase();
  if (!trimmedQuery) {
    return categoryFiltered.slice(0, MAX_ARTICLES);
  }

  return categoryFiltered.filter(
    (article) =>
      article.title.toLowerCase().includes(trimmedQuery) ||
      (article.summary?.toLowerCase().includes(trimmedQuery) ?? false),
  );
};
