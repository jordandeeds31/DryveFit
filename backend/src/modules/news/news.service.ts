import Parser from "rss-parser";
import { getBlogPosts } from "../blog/blog.service";

// Each of these publishes a real, actively-updated RSS feed — verified by
// hand, both that the feed itself works and that it's still being posted to.
// Several well-known blogs failed one or the other: BarBend's /feed/ 404s
// and NerdFitness/TrainHeroic/EatingWell block automated requests with a
// 403 despite looking legitimate at a glance; Breaking Muscle, StrongLifts,
// and Juggernaut Training Systems all have working feeds that simply
// haven't been posted to in 1-3 years, so they'd sit in this list forever
// contributing nothing; examine.com's feed rate-limited a single test
// request (429), too unreliable to depend on. Scraping raw HTML off these
// sites instead was deliberately ruled out — it's fragile against
// redesigns and against most sites' Terms of Service, where RSS is the
// sanctioned way to pull syndicated content.
const FEED_SOURCES: { name: string; url: string }[] = [
  { name: "Muscle & Fitness", url: "https://www.muscleandfitness.com/feed/" },
  { name: "Stronger by Science", url: "https://www.strongerbyscience.com/feed/" },
  { name: "Precision Nutrition", url: "https://www.precisionnutrition.com/blog/feed" },
  { name: "Nutrition Stripped", url: "https://nutritionstripped.com/feed/" },
  {
    name: "Harvard Nutrition Source",
    url: "https://nutritionsource.hsph.harvard.edu/feed/",
  },
];

const MAX_ARTICLES = 40;
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
  publishedAt: string | null;
  summary: string | null;
  coverImageUrl?: string | null;
  isOwnPost?: boolean;
}

let rssCache: { articles: NewsArticle[]; fetchedAt: number } | null = null;

const parser = new Parser();

// WordPress (which every RSS source above runs on) always appends "The post
// <a>Title</a> appeared first on <a>Site</a>." to the plain description —
// useful in an RSS reader that credits the source itself, redundant here
// since the card already shows the source name, so it's stripped along with
// the surrounding HTML tags to leave a clean plain-text summary.
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
        publishedAt: item.isoDate ?? item.pubDate ?? null,
        summary: cleanSummary(item.contentSnippet ?? item.content),
      }));
  } catch (err) {
    // One dead/slow blog shouldn't take down the whole feed — logged, not
    // thrown, same "never fail the whole request over one bad dependency"
    // pattern used elsewhere (e.g. DM push notifications).
    console.warn(`Failed to fetch news feed "${source.name}":`, err);
    return [];
  }
};

// Cached uncapped and unfiltered — a keyword search should be able to match
// against everything actually fetched, not just whatever made the top-40
// recency cut. In practice the five feeds combined rarely exceed ~40 items
// anyway, so this mostly matters for correctness, not a real volume of
// hidden results. Only the RSS side is cached — user blog posts are a fast
// local DB query and should show up immediately after posting, not wait up
// to 15 minutes.
const getCachedRssArticles = async (): Promise<NewsArticle[]> => {
  if (rssCache && Date.now() - rssCache.fetchedAt < CACHE_TTL_MS) {
    return rssCache.articles;
  }

  const results = await Promise.all(FEED_SOURCES.map(fetchFeed));
  const articles = results.flat().sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });

  rssCache = { articles, fetchedAt: Date.now() };
  return articles;
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
): Promise<NewsArticle[]> => {
  const [rssArticles, blogPosts] = await Promise.all([
    getCachedRssArticles(),
    getBlogPosts(viewerId),
  ]);

  const allArticles = [...rssArticles, ...blogPosts.map(toBlogNewsArticle)].sort(
    (a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    },
  );

  const trimmedQuery = query?.trim().toLowerCase();
  if (!trimmedQuery) {
    return allArticles.slice(0, MAX_ARTICLES);
  }

  return allArticles.filter(
    (article) =>
      article.title.toLowerCase().includes(trimmedQuery) ||
      (article.summary?.toLowerCase().includes(trimmedQuery) ?? false),
  );
};
