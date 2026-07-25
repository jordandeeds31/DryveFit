import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 min — avoid refetch spam on screen focus
      refetchOnWindowFocus: false, // not relevant on native, but explicit
    },
    mutations: {
      retry: 0, // don't silently retry POST/PUT — let the user retry explicitly
    },
  },
});
