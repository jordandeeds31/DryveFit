import { env } from "../config/env";

// YouTube Data API v3's videos.list (part=snippet) is public metadata —
// no OAuth, just an API key, with a generous free daily quota (10,000
// units/day; this call costs 1). The video's `description` field is the
// closest equivalent to a TikTok caption — where recipe creators put
// ingredient lists — as opposed to actual closed-caption/transcript
// tracks, which are a different, heavier API and often auto-generated
// spoken-word text rather than a written recipe.
const BASE_URL = "https://www.googleapis.com/youtube/v3/videos";

const isConfigured = (): boolean => !!env.YOUTUBE_API_KEY;

const VIDEO_ID_PATTERNS = [
  // youtube.com/watch?v=ID, m.youtube.com/watch?v=ID (query param, so no
  // need to anchor — extractVideoId reads it via URLSearchParams instead)
  // youtu.be/ID
  /youtu\.be\/([\w-]{11})/,
  // youtube.com/shorts/ID, youtube.com/embed/ID, youtube.com/live/ID
  /youtube\.com\/(?:shorts|embed|live)\/([\w-]{11})/,
];

const extractVideoId = (parsed: URL): string | null => {
  const fromQuery = parsed.searchParams.get("v");
  if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) return fromQuery;

  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = parsed.href.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export type YouTubeCaptionErrorReason =
  | "invalid_url"
  | "not_found_or_private"
  | "network_error";

export interface YouTubeCaptionSuccess {
  ok: true;
  videoId: string;
  caption: string;
  authorHandle: string;
  authorName: string;
  thumbnailUrl: string | null;
}

export interface YouTubeCaptionError {
  ok: false;
  reason: YouTubeCaptionErrorReason;
  message: string;
}

export type YouTubeCaptionOutcome = YouTubeCaptionSuccess | YouTubeCaptionError;

// On-demand only, same constraint as fetchTikTokCaption: one URL in, one
// fetch, no loop/queue/schedule anywhere.
export const fetchYouTubeCaption = async (
  rawUrl: string,
): Promise<YouTubeCaptionOutcome> => {
  if (!isConfigured()) {
    return {
      ok: false,
      reason: "network_error",
      message: "YouTube import isn't configured yet.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      ok: false,
      reason: "invalid_url",
      message: "That doesn't look like a valid URL.",
    };
  }

  if (
    !parsed.hostname.endsWith("youtube.com") &&
    parsed.hostname !== "youtu.be"
  ) {
    return {
      ok: false,
      reason: "invalid_url",
      message: "That doesn't look like a YouTube link.",
    };
  }

  const videoId = extractVideoId(parsed);
  if (!videoId) {
    return {
      ok: false,
      reason: "invalid_url",
      message: "Couldn't find a video in that link.",
    };
  }

  const params = new URLSearchParams({
    part: "snippet",
    id: videoId,
    key: env.YOUTUBE_API_KEY!,
  });

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}?${params.toString()}`);
  } catch {
    return {
      ok: false,
      reason: "network_error",
      message: "Couldn't reach YouTube — try again.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: "network_error",
      message: "Couldn't reach YouTube — try again.",
    };
  }

  const data = await response.json();
  const snippet = data.items?.[0]?.snippet;

  // YouTube returns an empty items array for a nonexistent, private, or
  // deleted video — same collapsed-error-bucket situation as TikTok's
  // oEmbed, no way to tell those cases apart from this response alone.
  if (!snippet) {
    return {
      ok: false,
      reason: "not_found_or_private",
      message: "This video couldn't be found — it may be private or deleted.",
    };
  }

  return {
    ok: true,
    videoId,
    caption: typeof snippet.description === "string" ? snippet.description : "",
    authorHandle: "",
    authorName: typeof snippet.channelTitle === "string" ? snippet.channelTitle : "",
    thumbnailUrl:
      snippet.thumbnails?.high?.url ??
      snippet.thumbnails?.default?.url ??
      null,
  };
};
