/**
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { perFeedAsyncStore } from '../src/lib/perFeedAsyncStore'

// Use the official AsyncStorage mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

// The legacy chunkAsyncStore is only used during migration; mock it so that
// unit-testing perFeedAsyncStore doesn't pull in the real module.
jest.mock('../src/lib/chunkAsyncStore', () => ({
  chunkAsyncStore: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}))

const { chunkAsyncStore } = require('../src/lib/chunkAsyncStore')

// Helper: build the Zustand-persist-style JSON string that feed.ts writes.
const makeZustandValue = (feeds: object[], version = 0) =>
  JSON.stringify({ state: { feeds }, version })

const sampleFeed = (id: string) => ({
  id,
  title: `Feed ${id}`,
  feedUrl: `https://example.com/${id}/rss.xml`,
  link: `https://example.com/${id}`,
  isLoading: false,
  items: [
    {
      id: `item-${id}-1`,
      link: `https://example.com/${id}/post/1`,
      title: 'Post 1',
      unread: true,
    },
    {
      id: `item-${id}-2`,
      link: `https://example.com/${id}/post/2`,
      title: 'Post 2',
      unread: false,
    },
  ],
})

beforeEach(async () => {
  await AsyncStorage.clear()
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// setItem
// ---------------------------------------------------------------------------

describe('setItem', () => {
  it('writes a feed-index key listing all feed IDs', async () => {
    const feeds = [sampleFeed('a'), sampleFeed('b')]
    await perFeedAsyncStore.setItem('feedit', makeZustandValue(feeds))

    const indexStr = await AsyncStorage.getItem('feedit-feed-index')
    expect(JSON.parse(indexStr!)).toEqual(['a', 'b'])
  })

  it('writes per-feed metadata keys without items', async () => {
    const feed = sampleFeed('x')
    await perFeedAsyncStore.setItem('feedit', makeZustandValue([feed]))

    const metaStr = await AsyncStorage.getItem('feedit-feed-x')
    const meta = JSON.parse(metaStr!)
    expect(meta.id).toBe('x')
    expect(meta.title).toBe('Feed x')
    // Items must NOT be embedded in the metadata key.
    expect(meta.items).toBeUndefined()
  })

  it('writes per-feed items keys', async () => {
    const feed = sampleFeed('y')
    await perFeedAsyncStore.setItem('feedit', makeZustandValue([feed]))

    const itemsStr = await AsyncStorage.getItem('feedit-items-y')
    const items = JSON.parse(itemsStr!)
    expect(items).toHaveLength(2)
    expect(items[0].id).toBe('item-y-1')
  })

  it('persists version metadata', async () => {
    await perFeedAsyncStore.setItem('feedit', makeZustandValue([], 3))

    const metaStr = await AsyncStorage.getItem('feedit-meta')
    expect(JSON.parse(metaStr!)).toEqual({ version: 3 })
  })

  it('removes keys for feeds that were deleted', async () => {
    // First write: two feeds.
    const feeds = [sampleFeed('del1'), sampleFeed('del2')]
    await perFeedAsyncStore.setItem('feedit', makeZustandValue(feeds))

    // Second write: only one feed remains.
    await perFeedAsyncStore.setItem(
      'feedit',
      makeZustandValue([sampleFeed('del1')])
    )

    expect(await AsyncStorage.getItem('feedit-feed-del2')).toBeNull()
    expect(await AsyncStorage.getItem('feedit-items-del2')).toBeNull()
    expect(await AsyncStorage.getItem('feedit-feed-del1')).not.toBeNull()
  })

  it('handles feeds with no items array gracefully', async () => {
    const feed = { id: 'noitems', title: 'No Items', feedUrl: '', link: '' }
    await perFeedAsyncStore.setItem('feedit', makeZustandValue([feed]))

    const itemsStr = await AsyncStorage.getItem('feedit-items-noitems')
    expect(JSON.parse(itemsStr!)).toEqual([])
  })

  it('ignores null/undefined entries in the feeds array (from syncAll undefined returns)', async () => {
    // syncAll returns undefined for feeds without a feedUrl; JSON.stringify
    // converts those to null.  setItem must skip them and not throw.
    const valueWithNulls = JSON.stringify({
      state: {
        feeds: [sampleFeed('valid1'), null, sampleFeed('valid2'), null],
      },
      version: 0,
    })
    await perFeedAsyncStore.setItem('feedit', valueWithNulls)

    const indexStr = await AsyncStorage.getItem('feedit-feed-index')
    expect(JSON.parse(indexStr!)).toEqual(['valid1', 'valid2'])
    expect(await AsyncStorage.getItem('feedit-feed-valid1')).not.toBeNull()
    expect(await AsyncStorage.getItem('feedit-feed-valid2')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getItem
// ---------------------------------------------------------------------------

describe('getItem', () => {
  it('returns null when storage is empty and no legacy data exists', async () => {
    const result = await perFeedAsyncStore.getItem('feedit')
    expect(result).toBeNull()
  })

  it('reconstructs feeds from per-feed keys after a setItem round-trip', async () => {
    const original = [sampleFeed('r1'), sampleFeed('r2')]
    await perFeedAsyncStore.setItem('feedit', makeZustandValue(original, 0))

    const raw = await perFeedAsyncStore.getItem('feedit')
    const parsed = JSON.parse(raw!)

    expect(parsed.state.feeds).toHaveLength(2)
    const r1 = parsed.state.feeds.find((f: { id: string }) => f.id === 'r1')
    expect(r1).toBeDefined()
    expect(r1.items).toHaveLength(2)
    expect(r1.items[0].id).toBe('item-r1-1')
  })

  it('restores the correct Zustand version', async () => {
    await perFeedAsyncStore.setItem('feedit', makeZustandValue([], 7))
    const raw = await perFeedAsyncStore.getItem('feedit')
    expect(JSON.parse(raw!).version).toBe(7)
  })

  it('skips a feed whose metadata key is missing', async () => {
    // Write normally, then corrupt by removing one feed's meta key.
    const feeds = [sampleFeed('m1'), sampleFeed('m2')]
    await perFeedAsyncStore.setItem('feedit', makeZustandValue(feeds))
    await AsyncStorage.removeItem('feedit-feed-m2')

    const raw = await perFeedAsyncStore.getItem('feedit')
    const parsed = JSON.parse(raw!)
    expect(parsed.state.feeds).toHaveLength(1)
    expect(parsed.state.feeds[0].id).toBe('m1')
  })

  it('uses an empty items array when an items key is missing', async () => {
    const feeds = [sampleFeed('mi')]
    await perFeedAsyncStore.setItem('feedit', makeZustandValue(feeds))
    await AsyncStorage.removeItem('feedit-items-mi')

    const raw = await perFeedAsyncStore.getItem('feedit')
    const parsed = JSON.parse(raw!)
    expect(parsed.state.feeds[0].items).toEqual([])
  })

  describe('migration from legacy storage', () => {
    it('migrates data from the legacy key on first load and removes it', async () => {
      const legacyFeeds = [sampleFeed('leg1')]
      const legacyValue = makeZustandValue(legacyFeeds)
      ;(chunkAsyncStore.getItem as jest.Mock).mockResolvedValueOnce(legacyValue)

      const result = await perFeedAsyncStore.getItem('feedit')

      // Should return the legacy value so Zustand can hydrate immediately.
      expect(result).toBe(legacyValue)

      // The legacy key should be removed.
      expect(chunkAsyncStore.removeItem).toHaveBeenCalledWith('feedit')

      // New per-feed keys should now exist.
      const indexStr = await AsyncStorage.getItem('feedit-feed-index')
      expect(JSON.parse(indexStr!)).toEqual(['leg1'])
    })

    it('retains legacy data when the migration write fails to produce an index', async () => {
      // Simulate a scenario where setItem encounters an error before writing
      // the index (e.g. storage is full).  The legacy data must NOT be removed
      // so the user still has their feeds on the next app start.
      const legacyFeeds = [sampleFeed('safe1')]
      const legacyValue = makeZustandValue(legacyFeeds)
      ;(chunkAsyncStore.getItem as jest.Mock).mockResolvedValueOnce(legacyValue)

      // Make ALL multiSet calls fail so the index is never written.
      const multiSetSpy = jest
        .spyOn(AsyncStorage, 'multiSet')
        .mockRejectedValue(new Error('Storage full'))

      const result = await perFeedAsyncStore.getItem('feedit')

      // Still returns the legacy data for this session.
      expect(result).toBe(legacyValue)

      // Legacy key must NOT have been removed because the index wasn't written.
      expect(chunkAsyncStore.removeItem).not.toHaveBeenCalled()

      multiSetSpy.mockRestore()
    })

    it('returns null when no index and no legacy data exist', async () => {
      ;(chunkAsyncStore.getItem as jest.Mock).mockResolvedValueOnce(null)
      expect(await perFeedAsyncStore.getItem('feedit')).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// removeItem
// ---------------------------------------------------------------------------

describe('removeItem', () => {
  it('removes all per-feed keys and the index', async () => {
    const feeds = [sampleFeed('rm1'), sampleFeed('rm2')]
    await perFeedAsyncStore.setItem('feedit', makeZustandValue(feeds))

    await perFeedAsyncStore.removeItem('feedit')

    expect(await AsyncStorage.getItem('feedit-feed-index')).toBeNull()
    expect(await AsyncStorage.getItem('feedit-meta')).toBeNull()
    expect(await AsyncStorage.getItem('feedit-feed-rm1')).toBeNull()
    expect(await AsyncStorage.getItem('feedit-items-rm1')).toBeNull()
    expect(await AsyncStorage.getItem('feedit-feed-rm2')).toBeNull()
    expect(await AsyncStorage.getItem('feedit-items-rm2')).toBeNull()
  })

  it('does not throw when storage is already empty', async () => {
    await expect(perFeedAsyncStore.removeItem('feedit')).resolves.not.toThrow()
  })
})
