export function getApiBaseUrl(): string {
  const fromProcess =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL?.trim() : undefined;
  const fromVite =
    typeof import.meta !== "undefined"
      ? (import.meta.env.VITE_API_URL as string | undefined) ??
        (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined)
      : undefined;
  const raw = fromProcess ?? fromVite ?? "";
  return raw.replace(/\/$/, "");
}
