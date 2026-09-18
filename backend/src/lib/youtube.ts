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
  // The canonical https://www.youtube.com/watch?v=<id> URL — stable
  // regardless of whether the share arrived as a Short, a youtu.be short
  // link, or a watch link with tracking params (?si=...), so callers can
  // use it as a dedup key instead of the raw share URL.
  canonicalUrl: string;
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
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    caption: typeof snippet.description === "string" ? snippet.description : "",
    authorHandle: "",
    authorName: typeof snippet.channelTitle === "string" ? snippet.channelTitle : "",
    thumbnailUrl:
      snippet.thumbnails?.high?.url ??
      snippet.thumbnails?.default?.url ??
      null,
  };
};

const decodeXmlEntities = (text: string): string =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

interface YouTubeCaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

// ytInitialPlayerResponse is a JSON blob YouTube embeds directly in the
// watch page's HTML for the player to read client-side — reading it back
// out is just parsing a public page's own markup, not downloading video
// or audio content the way a video-download tool would. Regex can't find
// where this multi-hundred-KB nested object actually ends (a non-greedy
// match stops at the first "}", which is nearly always mid-structure, not
// the real close) — this scans forward counting brace depth instead,
// treating quoted strings as opaque so a "}" inside a string value never
// throws off the count.
const extractPlayerResponse = (html: string): any | null => {
  const marker = "ytInitialPlayerResponse = {";
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return null;
  const objStart = startIdx + marker.length - 1; // include the opening "{"

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = objStart; i < html.length; i++) {
    const char = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(objStart, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

// Fallback for when the description alone doesn't contain a real recipe
// (see extractRecipeFromLink in recipeImport.service.ts) — the video's
// own caption/subtitle track, which often has the spoken ingredient list
// and steps even when the description is just hashtags. Not part of the
// official YouTube Data API v3 (which has no transcript endpoint for
// arbitrary third-party videos); this reads the same public caption
// track the YouTube player itself displays, the same category of access
// as fetching a page a browser would render, not a scraped video/audio
// file. Returns null (not an error) on any failure — a missing
// transcript should fall through to "no recipe detected", not surface
// as a hard error.
export const fetchYouTubeTranscript = async (videoId: string): Promise<string | null> => {
  let html: string;
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) return null;
    html = await response.text();
  } catch {
    return null;
  }

  const playerResponse = extractPlayerResponse(html);
  const tracks: YouTubeCaptionTrack[] | undefined =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || tracks.length === 0) return null;

  // Prefer a manually-created English track over an auto-generated
  // ("asr") one when both exist — manual captions are usually more
  // accurate for exact ingredient names/quantities.
  const track =
    tracks.find((t) => t.languageCode.startsWith("en") && t.kind !== "asr") ??
    tracks.find((t) => t.languageCode.startsWith("en")) ??
    tracks[0];

  let captionXml: string;
  try {
    const response = await fetch(track.baseUrl);
    if (!response.ok) return null;
    captionXml = await response.text();
  } catch {
    return null;
  }

  const lines = [...captionXml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((match) =>
    decodeXmlEntities(match[1]).trim(),
  );
  const transcript = lines.filter(Boolean).join(" ");
  return transcript.length > 0 ? transcript : null;
};
