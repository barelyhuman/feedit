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
 * per-feed layout and removes the old key.
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
          await chunkAsyncStore.removeItem(LEGACY_FEED_KEY)
          return legacyData as string
        }
        return null
      }

      const parsedIndex: unknown = JSON.parse(indexStr)
      const feedIds: string[] = Array.isArray(parsedIndex) ? parsedIndex : []
      const metaStr = await AsyncStorage.getItem(FEED_META_KEY)
      const meta = metaStr ? JSON.parse(metaStr) : { version: 0 }

      const [feedMetaResults, feedItemsResults] = await Promise.all([
        Promise.all(
          feedIds.map(id => AsyncStorage.getItem(FEED_META_PREFIX + id))
        ),
        Promise.all(
          feedIds.map(id => AsyncStorage.getItem(FEED_ITEMS_PREFIX + id))
        ),
      ])

      const feeds = feedIds.reduce<
        Array<AnyFeedMeta & { items: AnyFeedItem[] }>
      >((acc, id, i) => {
        const feedMeta = feedMetaResults[i]
          ? JSON.parse(feedMetaResults[i]!)
          : null
        const items: AnyFeedItem[] = feedItemsResults[i]
          ? JSON.parse(feedItemsResults[i]!)
          : []
        if (feedMeta) {
          acc.push({ ...feedMeta, items })
        } else {
          console.warn(
            `[perFeedAsyncStore] Missing metadata for feed ${id}, skipping`
          )
        }
        return acc
      }, [])

      return JSON.stringify({ state: { feeds }, version: meta.version ?? 0 })
    } catch (err) {
      console.error('[perFeedAsyncStore] getItem error:', err)
      return null
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value) as {
        state: { feeds: Array<{ id: string; items?: AnyFeedItem[] }> }
        version: number
      }
      const feeds = parsed.state?.feeds ?? []

      // Determine which feed IDs were removed so we can clean them up.
      const existingIndexStr = await AsyncStorage.getItem(FEED_INDEX_KEY)
      const existingIds: string[] = existingIndexStr
        ? JSON.parse(existingIndexStr)
        : []
      const newIds = feeds.map(f => f.id)
      const removedIds = existingIds.filter(id => !newIds.includes(id))

      await Promise.all(
        removedIds.flatMap(id => [
          AsyncStorage.removeItem(FEED_META_PREFIX + id),
          AsyncStorage.removeItem(FEED_ITEMS_PREFIX + id),
        ])
      )

      // Persist each feed's metadata and items under their own keys.
      await Promise.all(
        feeds.flatMap(feed => {
          const { items = [], ...feedMeta } = feed
          return [
            AsyncStorage.setItem(
              FEED_META_PREFIX + feed.id,
              JSON.stringify(feedMeta)
            ),
            AsyncStorage.setItem(
              FEED_ITEMS_PREFIX + feed.id,
              JSON.stringify(items)
            ),
          ]
        })
      )

      // Update the index and version metadata.
      await Promise.all([
        AsyncStorage.setItem(FEED_INDEX_KEY, JSON.stringify(newIds)),
        AsyncStorage.setItem(
          FEED_META_KEY,
          JSON.stringify({ version: parsed.version })
        ),
      ])
    } catch (err) {
      console.error('[perFeedAsyncStore] setItem error:', err)
    }
  },

  removeItem: async (_name: string): Promise<void> => {
    try {
      const indexStr = await AsyncStorage.getItem(FEED_INDEX_KEY)
      if (indexStr) {
        const feedIds: string[] = JSON.parse(indexStr)
        await Promise.all(
          feedIds.flatMap(id => [
            AsyncStorage.removeItem(FEED_META_PREFIX + id),
            AsyncStorage.removeItem(FEED_ITEMS_PREFIX + id),
          ])
        )
      }
      await Promise.all([
        AsyncStorage.removeItem(FEED_INDEX_KEY),
        AsyncStorage.removeItem(FEED_META_KEY),
      ])
    } catch (err) {
      console.error('[perFeedAsyncStore] removeItem error:', err)
    }
  },
}
