/** In-memory ETag cache for conditional GET (per MarketsClient instance). */
export class EtagCache {
  private readonly store = new Map<string, { etag: string; body: unknown }>();

  get(url: string): { etag: string; body: unknown } | undefined {
    return this.store.get(url);
  }

  set(url: string, etag: string, body: unknown): void {
    this.store.set(url, { etag, body });
  }

  delete(url: string): void {
    this.store.delete(url);
  }

  clear(): void {
    this.store.clear();
  }
}
