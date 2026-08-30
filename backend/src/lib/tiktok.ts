// TikTok's oEmbed endpoint (https://www.tiktok.com/oembed) is fully public
// and unauthenticated — no API key, no OAuth, no app review. Its `title`
// field is the post's complete caption (hashtags included), which is what
// makes it viable as a zero-config starting point.
//
// Verified limitation: the endpoint returns an identical generic
// {"message":"Something went wrong","code":400} for a nonexistent,
// private, deleted, or malformed-ID video — there is no way to
// distinguish those cases from the response, so callers only get one
// "not_found_or_private" bucket rather than three specific reasons.
const OEMBED_URL = "https://www.tiktok.com/oembed";

const VIDEO_ID_PATTERN = /\/video\/(\d+)/;

// Matches a canonical (or embed-redirect) video URL directly — the
// username segment is ignored since TikTok's own short-link redirects
// sometimes resolve to an empty "@/video/<id>" with no real handle.
const extractVideoId = (pathOrUrl: string): string | null => {
  const match = pathOrUrl.match(VIDEO_ID_PATTERN);
  return match ? match[1] : null;
};

// Short links (vm.tiktok.com/..., tiktok.com/t/...) carry no video ID in
// the URL itself — TikTok 302-redirects them server-side to the canonical
// .../video/<id> URL (confirmed live), so resolve that redirect once
// rather than trying to parse a short code that has no fixed format.
const resolveRedirect = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "manual" });
    return response.headers.get("location");
  } catch {
    return null;
  }
};

export type TikTokCaptionErrorReason =
  | "invalid_url"
  | "not_found_or_private"
  | "network_error";

export interface TikTokCaptionSuccess {
  ok: true;
  videoId: string;
  caption: string;
  authorHandle: string;
  authorName: string;
  thumbnailUrl: string | null;
}

export interface TikTokCaptionError {
  ok: false;
  reason: TikTokCaptionErrorReason;
  message: string;
}

export type TikTokCaptionOutcome = TikTokCaptionSuccess | TikTokCaptionError;

// On-demand only: fetches exactly one video's caption for one caller-
// supplied URL, once per call. No loop, no queue, no schedule — nothing
// in this file or its callers may wrap this in one, since that distinction
// (a user explicitly submitting a single link vs. any form of crawling)
// is what this feature's legal footing depends on.
export const fetchTikTokCaption = async (
  rawUrl: string,
): Promise<TikTokCaptionOutcome> => {
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

  if (!parsed.hostname.endsWith("tiktok.com")) {
    return {
      ok: false,
      reason: "invalid_url",
      message: "That doesn't look like a TikTok link.",
    };
  }

  let videoId = extractVideoId(parsed.pathname);
  if (!videoId) {
    const redirectTarget = await resolveRedirect(rawUrl);
    if (redirectTarget) {
      videoId = extractVideoId(redirectTarget);
    }
  }

  if (!videoId) {
    return {
      ok: false,
      reason: "invalid_url",
      message: "Couldn't find a video in that link.",
    };
  }

  // Reconstructed from the extracted ID rather than passed through as
  // originally received — keeps the oEmbed request independent of
  // whatever tracking query params or redirect artifacts the share link
  // carried.
  const canonicalUrl = `https://www.tiktok.com/@/video/${videoId}`;
  const oembedUrl = `${OEMBED_URL}?url=${encodeURIComponent(canonicalUrl)}`;

  let response: Response;
  try {
    response = await fetch(oembedUrl);
  } catch {
    return {
      ok: false,
      reason: "network_error",
      message: "Couldn't reach TikTok — try again.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: "not_found_or_private",
      message: "This TikTok couldn't be found — it may be private or deleted.",
    };
  }

  const data = await response.json();
  return {
    ok: true,
    videoId,
    caption: typeof data.title === "string" ? data.title : "",
    authorHandle: typeof data.author_unique_id === "string" ? data.author_unique_id : "",
    authorName: typeof data.author_name === "string" ? data.author_name : "",
    thumbnailUrl: typeof data.thumbnail_url === "string" ? data.thumbnail_url : null,
  };
};
