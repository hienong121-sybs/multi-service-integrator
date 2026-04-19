// Path: /src/lib/cache/ApiCache.ts
// Module: ApiCache
// Depends on: none
// Description: In-memory server-side cache with TTL and in-flight request deduplication.
// Dùng cho API route handlers để tránh gọi Firebase RTDB lặp lại trong cùng khoảng thời gian ngắn.

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class ApiCacheImpl {
  private readonly store = new Map<string, CacheEntry<unknown>>()
  private readonly inflight = new Map<string, Promise<unknown>>()

  /**
   * Lấy data từ cache hoặc gọi fetcher nếu cache expired.
   * In-flight deduplication: nhiều request cùng key → share 1 Promise.
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs = 30_000,
  ): Promise<T> {
    // Cache hit
    const cached = this.store.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T
    }

    // In-flight deduplication: nếu đang có request cùng key → chờ chung
    const existing = this.inflight.get(key)
    if (existing) {
      return existing as Promise<T>
    }

    // Kick off fresh fetch
    const promise = fetcher()
      .then((data) => {
        this.store.set(key, { data, expiresAt: Date.now() + ttlMs })
        return data
      })
      .finally(() => {
        this.inflight.delete(key)
      })

    this.inflight.set(key, promise as Promise<unknown>)
    return promise
  }

  /** Xóa cache entry theo key (gọi sau khi write/delete). */
  invalidate(key: string): void {
    this.store.delete(key)
  }

  /** Xóa tất cả cache entries có prefix. */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key)
      }
    }
  }

  /** Build cache key chuẩn cho service list. */
  serviceListKey(uid: string, serviceType: string): string {
    return ApiCacheImpl.serviceListKey(uid, serviceType)
  }

  /** Build cache key cho service detail. */
  serviceDetailKey(uid: string, serviceType: string, id: string): string {
    return ApiCacheImpl.serviceDetailKey(uid, serviceType, id)
  }

  /** Build cache key chuẩn cho service list. */
  static serviceListKey(uid: string, serviceType: string): string {
    return `svc-list:${uid}:${serviceType}`
  }

  /** Build cache key cho service detail. */
  static serviceDetailKey(uid: string, serviceType: string, id: string): string {
    return `svc-detail:${uid}:${serviceType}:${id}`
  }
}

// Singleton — Next.js giữ module trong memory giữa các requests (trừ khi cold start)
// Module-level singleton tồn tại trong process, hiệu quả cho cùng instance
export const ApiCache = new ApiCacheImpl()
