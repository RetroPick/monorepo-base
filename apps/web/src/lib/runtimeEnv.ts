export function getApiBaseUrl(): string {
  // Vite (legacy fe-v1) exposes config on `import.meta.env`, which is undefined under
  // Next.js; there public config is inlined via `process.env.NEXT_PUBLIC_*`. Support both.
  const raw =
    import.meta.env?.VITE_API_URL ??
    import.meta.env?.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "";
  return raw.replace(/\/$/, "");
}
