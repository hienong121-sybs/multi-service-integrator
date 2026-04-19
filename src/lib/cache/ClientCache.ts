// Path: /src/lib/cache/ClientCache.ts
// Module: ClientCache
// Depends on: none
// Description: Browser-side in-memory fetch cache với SWR semantics.
// Dùng để tránh duplicate fetch khi nhiều component mount cùng lúc.

interface ClientEntry<T> {
  data: T
  fetchedAt: number
  staleAt: number  // sau staleAt → revalidate background
  expiresAt: number // sau expiresAt → bắt buộc refetch
}

type Subscriber<T> = (data: T) => void

class ClientCacheImpl {
  private readonly store = new Map<string, ClientEntry<unknown>>()
  private readonly inflight = new Map<string, Promise<unknown>>()
  private readonly subscribers = new Map<string, Set<Subscriber<unknown>>>()

  /**
   * Stale-while-revalidate:
   * - Nếu có cache còn fresh → trả về ngay, không fetch
   * - Nếu stale nhưng chưa expire → trả về stale, background revalidate
   * - Nếu expired → fetch và chờ
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    opts: { staleMs?: number; expireMs?: number } = {},
  ): Promise<T> {
    const staleMs = opts.staleMs ?? 10_000   // 10s fresh
    const expireMs = opts.expireMs ?? 60_000  // 60s max stale

    const now = Date.now()
    const cached = this.store.get(key) as ClientEntry<T> | undefined

    if (cached) {
      if (now < cached.staleAt) {
        // Still fresh — return immediately
        return cached.data
      }
      if (now < cached.expiresAt) {
        // Stale but usable — return stale, background revalidate
        this.backgroundRevalidate(key, fetcher, staleMs, expireMs)
        return cached.data
      }
    }

    // Expired or no cache — must fetch, deduplicate in-flight
    return this.fetchAndStore(key, fetcher, staleMs, expireMs)
  }

  /** Ghi đè cache entry từ ngoài (optimistic update). */
  set<T>(key: string, data: T, staleMs = 10_000, expireMs = 60_000): void {
    const now = Date.now()
    this.store.set(key, {
      data,
      fetchedAt: now,
      staleAt: now + staleMs,
      expiresAt: now + expireMs,
    })
    this.notify(key, data)
  }

  /** Subscribe để nhận update khi cache key thay đổi. */
  subscribe<T>(key: string, cb: Subscriber<T>): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }
    const set = this.subscribers.get(key)!
    set.add(cb as Subscriber<unknown>)
    return () => set.delete(cb as Subscriber<unknown>)
  }

  /** Xóa cache entry (sau write operation). */
  invalidate(key: string): void {
    this.store.delete(key)
  }

  /** Build cache key chuẩn cho service list. */
  serviceListKey(serviceType: string): string {
    return ClientCacheImpl.serviceListKey(serviceType)
  }

  /** Prefetch silently — không block, không throw. */
  prefetch<T>(key: string, fetcher: () => Promise<T>, staleMs = 10_000, expireMs = 60_000): void {
    const cached = this.store.get(key)
    if (cached && Date.now() < cached.staleAt) return // Already fresh
    this.fetchAndStore(key, fetcher, staleMs, expireMs).catch(() => undefined)
  }

  private async fetchAndStore<T>(
    key: string,
    fetcher: () => Promise<T>,
    staleMs: number,
    expireMs: number,
  ): Promise<T> {
    const existing = this.inflight.get(key)
    if (existing) return existing as Promise<T>

    const promise = fetcher()
      .then((data) => {
        const now = Date.now()
        this.store.set(key, {
          data,
          fetchedAt: now,
          staleAt: now + staleMs,
          expiresAt: now + expireMs,
        })
        this.notify(key, data)
        return data
      })
      .finally(() => {
        this.inflight.delete(key)
      })

    this.inflight.set(key, promise as Promise<unknown>)
    return promise
  }

  private backgroundRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    staleMs: number,
    expireMs: number,
  ): void {
    if (this.inflight.has(key)) return
    this.fetchAndStore(key, fetcher, staleMs, expireMs).catch(() => undefined)
  }

  private notify<T>(key: string, data: T): void {
    const set = this.subscribers.get(key)
    if (!set) return
    for (const cb of set) cb(data as unknown)
  }

  static serviceListKey(serviceType: string): string {
    return `svc-list:${serviceType}`
  }
}

export const ClientCache = new ClientCacheImpl()
