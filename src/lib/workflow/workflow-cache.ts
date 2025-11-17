import { WorkflowConfig } from "@/app/api/data/workflow/types";
import { authorizedFetch } from "@/lib/org-filtering";

/**
 * In-memory cache for workflow configurations with TTL (Time To Live)
 * Cache key format: "entityCode:orgUnitCode"
 */
interface WorkflowCacheEntry {
  config: WorkflowConfig;
  timestamp: number;
  ttl: number; // milliseconds
}

class WorkflowConfigCache {
  private cache = new Map<string, WorkflowCacheEntry>();
  private defaultTTL: number;

  constructor(defaultTTLMinutes = 30) {
    this.defaultTTL = defaultTTLMinutes * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Generate cache key from entity and org unit codes
   */
  private getCacheKey(entityCode: string, orgUnitCode: string): string {
    return `${entityCode}:${orgUnitCode}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: WorkflowCacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get workflow config from cache or fetch from database
   */
  async getWorkflowConfig(
    entityCode: string, 
    orgUnitCode: string, 
    customTTL?: number
  ): Promise<WorkflowConfig> {
    const cacheKey = this.getCacheKey(entityCode, orgUnitCode);
    const cached = this.cache.get(cacheKey);

    // Return cached entry if valid
    if (cached && this.isValid(cached)) {
      return cached.config;
    }

    // Fetch from database
    const config = await this.fetchWorkflowConfig(entityCode, orgUnitCode);
    
    // Cache the result
    this.cache.set(cacheKey, {
      config,
      timestamp: Date.now(),
      ttl: customTTL || this.defaultTTL
    });

    return config;
  }

  /**
   * Fetch workflow config from external data service
   */
  private async fetchWorkflowConfig(entityCode: string, orgUnitCode: string): Promise<WorkflowConfig> {
    const config = await authorizedFetch(
      `${process.env.DATA_URL}/api/data/workflow?entity_code=${entityCode}&org_unit_code=${orgUnitCode}`
    )
    .then(res => {
      if (!res.ok) throw new Error(`Failed to fetch workflow config: ${res.status} ${res.statusText}`);
      else return res.json()
    })
    .then(j => j as WorkflowConfig);
    return config;
  }

  /**
   * Invalidate cache entry for specific entity/org combination
   */
  invalidate(entityCode: string, orgUnitCode: string): void {
    const cacheKey = this.getCacheKey(entityCode, orgUnitCode);
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate all cache entries for an entity (across all org units)
   */
  invalidateEntity(entityCode: string): void {
    for (const [key] of this.cache) {
      if (key.startsWith(`${entityCode}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries from cache
   */
  cleanup(): void {
    for (const [key, entry] of this.cache) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const workflowConfigCache = new WorkflowConfigCache();

// Optional: Set up periodic cleanup (run every 10 minutes)
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    workflowConfigCache.cleanup();
  }, 10 * 60 * 1000);
}