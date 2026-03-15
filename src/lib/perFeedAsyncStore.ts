import AsyncStorage from '@react-native-async-storage/async-storage'
import { StateStorage } from 'zustand/middleware'
import { chunkAsyncStore } from './chunkAsyncStore'

/**
 * Per-feed storage adapter for Zustand's persist middleware.
 *
 * Storage layout:
 *   feedit-feed-index  — JSON array of feed IDs
 *   feedit-meta        — JSON object with Zustand version metadata
 *   feedit-feed-{id}   — JSON object with feed metadata (no items)
 *   feedit-items-{id}  — JSON array of feed items for that feed
 *
 * On first load, if no index is found, this module transparently migrates
 * data from the legacy single-key chunked storage ("feedit") into the new
 * per-feed layout and removes the old key only after verifying the write
 * succeeded.
 */

const FEED_INDEX_KEY = 'feedit-feed-index'
const FEED_META_KEY = 'feedit-meta'
const FEED_META_PREFIX = 'feedit-feed-'
const FEED_ITEMS_PREFIX = 'feedit-items-'
const LEGACY_FEED_KEY = 'feedit'

type AnyFeedMeta = Record<string, unknown>
type AnyFeedItem = Record<string, unknown>

export const perFeedAsyncStore: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const indexStr = await AsyncStorage.getItem(FEED_INDEX_KEY)

      if (indexStr === null) {
        // Attempt migration from the legacy chunked storage.
        const legacyData = await chunkAsyncStore.getItem(LEGACY_FEED_KEY)
        if (legacyData) {
          console.log('[perFeedAsyncStore] Migrating from legacy storage')
          await perFeedAsyncStore.setItem(name, legacyData as string)
          // Only remove legacy data once we confirm the index was written,
          // so that a partial write failure doesn't leave the user with no
          // data at all on the next app start.
          const newIndex = await AsyncStorage.getItem(FEED_INDEX_KEY)
          if (newIndex !== null) {
            await chunkAsyncStore.removeItem(LEGACY_FEED_KEY)
          } else {
            console.warn(
              '[perFeedAsyncStore] Migration write incomplete; legacy data retained'
            )
          }
          return legacyData as string
        }
        return null
      }

      const parsedIndex: unknown = JSON.parse(indexStr)
      const feedIds: string[] = Array.isArray(parsedIndex) ? parsedIndex : []
      const metaStr = await AsyncStorage.getItem(FEED_META_KEY)
      const meta = metaStr ? JSON.parse(metaStr) : { version: 0 }

      if (feedIds.length === 0) {
        return JSON.stringify({
          state: { feeds: [] },
          version: meta.version ?? 0,
        })
      }

      // Use batch reads to minimise storage round-trips.
      const feedMetaKeys = feedIds.map(id => FEED_META_PREFIX + id)
      const feedItemsKeys = feedIds.map(id => FEED_ITEMS_PREFIX + id)

      const [feedMetaEntries, feedItemsEntries] = await Promise.all([
        AsyncStorage.multiGet(feedMetaKeys),
        AsyncStorage.multiGet(feedItemsKeys),
      ])

      const itemsValuesByKey = new Map(feedItemsEntries)

      const feeds = feedMetaEntries.reduce<
        Array<AnyFeedMeta & { items: AnyFeedItem[] }>
      >((acc, [, metaValue], i) => {
        if (!metaValue) {
          console.warn(
            `[perFeedAsyncStore] Missing metadata for feed ${feedIds[i]}, skipping`
          )
          return acc
        }
        const feedMeta = JSON.parse(metaValue) as AnyFeedMeta
        const itemsStr = itemsValuesByKey.get(FEED_ITEMS_PREFIX + feedIds[i])
        const items: AnyFeedItem[] = itemsStr ? JSON.parse(itemsStr) : []
        acc.push({ ...feedMeta, items })
        return acc
      }, [])

      return JSON.stringify({ state: { feeds }, version: meta.version ?? 0 })
    } catch (err) {
      console.error('[perFeedAsyncStore] getItem error:', err)
      return null
    }
  },

  setItem: async (_name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value) as {
        state: { feeds: Array<{ id: string; items?: AnyFeedItem[] }> }
        version: number
      }
      // Filter out null/undefined entries that can appear when syncAll returns
      // undefined for feeds that have no feedUrl (JSON.stringify converts them
      // to null). We use != null to only exclude null/undefined, not other
      // falsy values that a valid feed might theoretically have.
      const feeds = (parsed.state?.feeds ?? []).filter(
        (feed): feed is NonNullable<typeof feed> => feed != null
      )

      // Determine which feed IDs were removed so we can clean them up.
      const existingIndexStr = await AsyncStorage.getItem(FEED_INDEX_KEY)
      const existingIds: string[] = existingIndexStr
        ? JSON.parse(existingIndexStr)
        : []
      const newIds = feeds.map(f => f.id)
      const removedIds = existingIds.filter(id => !newIds.includes(id))

      // Remove stale feed keys using a single batch call.
      if (removedIds.length > 0) {
        await AsyncStorage.multiRemove(
          removedIds.flatMap(id => [
            FEED_META_PREFIX + id,
            FEED_ITEMS_PREFIX + id,
          ])
        )
      }

      // Persist each feed's metadata and items using a single batch write.
      if (feeds.length > 0) {
        const pairs: [string, string][] = feeds.flatMap(feed => {
          const { items = [], ...feedMeta } = feed
          return [
            [FEED_META_PREFIX + feed.id, JSON.stringify(feedMeta)],
            [FEED_ITEMS_PREFIX + feed.id, JSON.stringify(items)],
          ] as [string, string][]
        })
        await AsyncStorage.multiSet(pairs)
      }

      // Update the index and version metadata last so that a partial write
      // above does not leave a stale index pointing at missing keys.
      await AsyncStorage.multiSet([
        [FEED_INDEX_KEY, JSON.stringify(newIds)],
        [FEED_META_KEY, JSON.stringify({ version: parsed.version })],
      ])
    } catch (err) {
      console.error('[perFeedAsyncStore] setItem error:', err)
    }
  },

  removeItem: async (_name: string): Promise<void> => {
    try {
      const indexStr = await AsyncStorage.getItem(FEED_INDEX_KEY)
      const keysToRemove: string[] = [FEED_INDEX_KEY, FEED_META_KEY]

      if (indexStr) {
        const feedIds: string[] = JSON.parse(indexStr)
        feedIds.forEach(id => {
          keysToRemove.push(FEED_META_PREFIX + id)
          keysToRemove.push(FEED_ITEMS_PREFIX + id)
        })
      }

      await AsyncStorage.multiRemove(keysToRemove)
    } catch (err) {
      console.error('[perFeedAsyncStore] removeItem error:', err)
    }
  },
}
