import { Cache, CacheEntry } from "./types";
import { CacheMetrics } from "./types";

// Generic Cache implementation
export class InMemoryCache implements Cache {

    constructor(
        private maxSize = 100,
        private cleanupEvery = 100,
        private cleanupBatchSize = 10
    ) {}

    private store = new Map<string, CacheEntry<any>>();
    private accessCount = 0;
    private metrics: CacheMetrics = {
        hits: 0,
        misses: 0,
        loads: 0,
        totalLoadTime: 0,
        evictions: 0,
        expiredRemovals: 0
    };

    /**
    * Get a cache entry 
    * @param key The cache key to get
    * @param loader A function to load the data from the database or file
    * @param ttlMs Time To Live for the entry in the 
    * @returns A promise to a config object.
    */
    async get<T>( key: string, loader: () => Promise<T>, ttlMs = 60_000): Promise<T> {
        const now = Date.now();
        const entry = this.store.get(key);

        // Periodically run clean-up
        this.accessCount++;
        if (this.accessCount % this.cleanupEvery === 0) this.cleanupExpired(this.cleanupBatchSize);

        // Cache hit
        if (entry?.value && entry.expiresAt > now) {
            this.metrics.hits++;
            // Mark as recently used
            this.store.delete(key);
            this.store.set(key, entry);
            return entry.value;
        }

        // Prevent concurrent reloads
        if (entry?.loading) {
            this.metrics.hits++; // shared load still counts as hit
            return entry.loading;
        }
        
        // Cache miss
        this.metrics.misses++;
        this.metrics.loads++;

        // Load fresh
        const startLoad = performance.now();
        const loading = loader()
            .then(value => {
                this.store.set(key, {
                    value,
                    expiresAt: now + ttlMs
                });
                this.metrics.totalLoadTime += performance.now() - startLoad;

                // Evict LRU if needed
                if (this.store.size > this.maxSize) {
                    const lruKey = this.store.keys().next().value;
                    if (lruKey) {
                        this.metrics.evictions++;
                        this.store.delete(lruKey);
                    }
                }

                return value;
            }).finally(() => {
                const e = this.store.get(key);
                if (e) delete e.loading;
            });

        this.store.set(key, {
            ...entry,
            loading,
            expiresAt: now + ttlMs
        });

        return loading;
    }

    /**
     * Invalidate a specific key
     * @param key Key that will be invalidated 
     */
    invalidate(key: string) {
        this.store.delete(key);
    }

    /**
     * Invalidate an entire prefix for instance all entities of a 
     * @param prefix Prefix to invalidate.
     */
    invalidatePrefix(prefix: string) {
        for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) {
            this.store.delete(key);
        }
        }
    }
    
    /**
    * Clear all cache entries
    */
    clear(): void {
        this.store.clear();
    }

    /**
     * Get the cache Metrics
     * @returns Cache metric + the store size
     */
    getMetrics() {
        const hitRatio = (this.metrics.hits + this.metrics.misses) > 0 ? this.metrics.hits / (this.metrics.hits + this.metrics.misses) : 0;
        
        return {
            ...this.metrics,
            size: this.store.size,
            hitRatio: hitRatio
        };
    }
    
    private cleanupExpired(maxEntries = 10) {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.store) {
            if (cleaned >= maxEntries) break;
            if (entry.expiresAt <= now && !entry.loading) {
                this.store.delete(key);
                cleaned++;
                this.metrics.expiredRemovals++;
            }
        }
    }
}

// Workflow cache, max size = 10, clean-up every 500 calls with a batch size of 2.
export const workflowConfigCache = new InMemoryCache(10, 500, 2);

// Eval Engine Rule cache, max size = 20, clean-up every 500 calls with a batch size of 5.
export const evalEngineRuleConfigCache = new InMemoryCache(20, 500, 5);

// Agent Model Config cache. max size = 10, clean-up every 2000 calls with a batch size of 2.
export const agentModelConfigCache = new InMemoryCache(10, 2000, 2);

// Agent Config cache. max size = 15, clean-up every 2000 calls with a batch size of 2.
export const agentConfigCache = new InMemoryCache(15, 2000, 2);

// Agent User Prefrence cache. Max Size = 100, clean-up every 500 calls with batchsize of 20.
export const agentUserPreferenceCache = new InMemoryCache(100, 500, 20);

// Permission cache. Max size = 100, clean-up every 1000 calls with a bach size of 5.
export const permissionCache = new InMemoryCache(100, 2000, 5);