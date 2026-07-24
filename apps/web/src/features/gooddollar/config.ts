/** GoodDollar beginner UX feature flag */
export const goodDollarEnabled =
  import.meta.env.VITE_GOODDOLLAR_ENABLED === "1" ||
  import.meta.env.VITE_GOODDOLLAR_ENABLED === "true";

export function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
}
