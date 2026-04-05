/**
 * Simple in-memory TTL cache for server-side API route handlers.
 * Lives in the Node.js process — survives across requests, resets on deploy/restart.
 */
const store = new Map()

/**
 * Returns cached data if still fresh, otherwise calls fetcher, caches, and returns the result.
 * @param {string}   key      Cache key
 * @param {number}   ttlMs    Time-to-live in milliseconds
 * @param {Function} fetcher  Async function that returns the data to cache
 */
export async function cached(key, ttlMs, fetcher) {
  const entry = store.get(key)
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data
  }
  const data = await fetcher()
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
  return data
}

/** Remove an entry so the next request re-fetches from the source. */
export function invalidate(key) {
  store.delete(key)
}
