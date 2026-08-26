import { useEffect, useRef } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

// Required once, at module scope, so the browser sheet used for the OAuth
// redirect actually closes itself on web — a no-op on iOS/Android (there
// the redirect resolves via ASWebAuthenticationSession/Custom Tabs
// directly, not this), but harmless to always call.
WebBrowser.maybeCompleteAuthSession();

// androidClientId intentionally omitted — no Android OAuth client exists
// yet (see EAS credentials setup). Attempting Google sign-in on Android
// before one's added will throw expo-auth-session's own "client ID is
// required" error, which is the correct behavior until that's set up.
export const useGoogleSignIn = (onIdToken: (idToken: string) => void) => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  // onIdToken is passed fresh every render from the calling component —
  // read through a ref in the effect below instead of listing it as a
  // dependency, so a new function identity each render doesn't re-fire
  // this effect (and doesn't need the caller to useCallback it either).
  const onIdTokenRef = useRef(onIdToken);
  onIdTokenRef.current = onIdToken;

  useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params.id_token ?? response.authentication?.idToken;
    if (idToken) onIdTokenRef.current(idToken);
  }, [response]);

  return {
    // promptAsync is only safe to call once `request` has finished
    // loading (it's briefly null on mount while expo-auth-session builds
    // the PKCE challenge) — callers should disable the button until then.
    isReady: !!request,
    promptAsync,
  };
};
