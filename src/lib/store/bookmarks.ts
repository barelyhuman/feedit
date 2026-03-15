import { create, useStore } from 'zustand'
import { derive } from 'derive-zustand'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/index'
import { bookmarks as bookmarksTable } from '../db/schema'
import { FeedItem, useFeedStore } from './feed'

export type BookmarkStore = {
  bookmarks: { feedId: string; itemId: string }[]
  hydrate: () => Promise<void>
  isInBookmark: (feedId: string, itemId: string) => boolean
  toggleBookmark: (feedId: string, itemId: string) => boolean
}

export const useBookmarkStore = create<BookmarkStore>()((set, get) => ({
  bookmarks: [],
  hydrate: async () => {
    const rows = await db.select().from(bookmarksTable).all()
    set({ bookmarks: rows.map(r => ({ feedId: r.feedId, itemId: r.itemId })) })
  },
  isInBookmark: (feedId: string, itemId: string) => {
    return get().bookmarks.some(
      d => d.feedId === feedId && d.itemId === itemId
    )
  },
  toggleBookmark: (feedId: string, itemId: string) => {
    const exists = get().bookmarks.some(
      d => d.feedId === feedId && d.itemId === itemId
    )
    if (exists) {
      db.delete(bookmarksTable)
        .where(and(eq(bookmarksTable.feedId, feedId), eq(bookmarksTable.itemId, itemId)))
        .run()
      set(state => ({
        bookmarks: state.bookmarks.filter(
          d => !(d.feedId === feedId && d.itemId === itemId)
        ),
      }))
      return false
    }
    db.insert(bookmarksTable).values([{ feedId, itemId }]).run()
    set(state => ({
      bookmarks: state.bookmarks.concat({ feedId, itemId }),
    }))
    return true
  },
}))

type BookmarkFeedT = FeedItem & { feedId: string }
const bookmarkFeedStore = derive<BookmarkFeedT[]>(get => {
  const bookmarks = get(useBookmarkStore).bookmarks
  const feeds = get(useFeedStore).feeds

  return feeds
    .map(feed => {
      return feed.items.map(item => {
        const inBookmark = bookmarks.some(
          bm => bm.feedId === feed.id && bm.itemId === item.id
        )
        return inBookmark
          ? {
              ...item,
              feedId: feed.id,
            }
          : null
      })
    })
    .flat(2)
    .filter(d => d) as BookmarkFeedT[]
})

export const useBookmarkFeedStore = () => useStore(bookmarkFeedStore)
