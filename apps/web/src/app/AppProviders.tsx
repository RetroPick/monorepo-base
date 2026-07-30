import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import { useState } from "react";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (failureCount >= 3) return false;
          const code = (error as { code?: string })?.code;
          if (code === "not_found" || code === "validation" || code === "aborted") return false;
          return true;
        },
        retryDelay: (attempt) => Math.min(30_000, 1000 * 2 ** attempt + Math.random() * 500),
        refetchOnWindowFocus: true,
      },
    },
  });
}

export default function AppProviders() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
