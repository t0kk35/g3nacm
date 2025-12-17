// Base cache interface, I want to be able to swap the cache out at a later stage.
export interface Cache {
  get<T>(key: string, loader: () => Promise<T>, ttlMs?: number): Promise<T>;
  invalidate(key: string): void;
  invalidatePrefix(prefix: string): void;
}

export type CacheEntry<T> = {
  value?: T;
  expiresAt: number;
  loading?: Promise<T>;
};

export type CacheMetrics = {
  hits: number;
  misses: number;
  loads: number;
  totalLoadTime: number;
  evictions: number;
  expiredRemovals: number;
};