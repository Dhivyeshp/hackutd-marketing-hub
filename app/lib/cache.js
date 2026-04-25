const store = new Map()

/**
 * Stale-while-revalidate cache.
 * - Fresh hit (within TTL): return immediately.
 * - Stale hit (past TTL): return stale data immediately, kick off background refresh.
 * - Cold miss: await the fetcher (only slow path is the very first load).
 */
export async function cached(key, ttlMs, fetcher) {
  const entry = store.get(key)

  if (entry) {
    if (Date.now() < entry.expiresAt) {
      return entry.data
    }
    // Stale: serve immediately and revalidate in background
    if (!entry.revalidating) {
      entry.revalidating = true
      fetcher()
        .then(data => store.set(key, { data, expiresAt: Date.now() + ttlMs, revalidating: false }))
        .catch(() => { if (store.has(key)) store.get(key).revalidating = false })
    }
    return entry.data
  }

  // Cold start — must wait
  const data = await fetcher()
  store.set(key, { data, expiresAt: Date.now() + ttlMs, revalidating: false })
  return data
}

/** Force next request to re-fetch from source (bypass stale-while-revalidate). */
export function invalidate(key) {
  store.delete(key)
}
