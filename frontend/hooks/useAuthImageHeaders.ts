import { useEffect, useState } from "react";
import { getToken } from "@/lib/storage/secureStore";

// expo-image's <Image source={{ uri }}> doesn't attach the stored auth
// token the way the axios apiClient does — any image served from an
// authMiddleware-protected route (profile pictures, exercise images) needs
// this passed explicitly via source.headers or it 401s and renders nothing.
export const useAuthImageHeaders = () => {
  const [headers, setHeaders] = useState<{ Authorization: string } | undefined>(
    undefined,
  );

  useEffect(() => {
    getToken().then((token) => {
      if (token) setHeaders({ Authorization: `Bearer ${token}` });
    });
  }, []);

  return headers;
};
