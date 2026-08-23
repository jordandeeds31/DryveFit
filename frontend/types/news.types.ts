export type NewsCategory =
  | "top_stories"
  | "sports"
  | "politics"
  | "world"
  | "crime"
  | "local"
  | "fitness_nutrition";

export interface NewsArticle {
  type: "rss" | "blog";
  // rss: not a real id, the link itself. blog: the actual BlogPost id.
  id: string;
  title: string;
  // rss: external URL, opened in an in-app browser. blog: empty — the
  // client navigates to the blog post detail screen by id instead.
  link: string;
  source: string;
  category: NewsCategory;
  publishedAt: string | null;
  summary: string | null;
  coverImageUrl?: string | null;
  isOwnPost?: boolean;
}

export interface BlogPostAuthor {
  id: string;
  username: string | null;
  profileImageUrl: string | null;
}

export interface BlogPost {
  id: string;
  title: string;
  body: string;
  coverImageUrl: string | null;
  createdAt: string;
  isOwnPost: boolean;
  author: BlogPostAuthor;
}
