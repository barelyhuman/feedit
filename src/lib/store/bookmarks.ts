import { create, useStore } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { chunkAsyncStore } from '../chunkAsyncStore';
import { derive } from 'derive-zustand';
import { FeedItem, useFeedStore } from './feed';

export type BookmarkStore = {
  bookmarks: { feedId: string; itemId: string }[];
  isInBookmark: (feedId: string, itemId: string) => boolean;
  toggleBookmark: (feedId: string, itemId: string) => boolean;
};

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      isInBookmark: (feedId: string, itemId: string) => {
        return get().bookmarks.some(
          d => d.feedId === feedId && d.itemId === itemId,
        );
      },
      toggleBookmark: (feedId: string, itemId: string) => {
        const exists = get().bookmarks.some(
          d => d.feedId === feedId && d.itemId === itemId,
        );
        if (exists) {
          set(state => ({
            bookmarks: state.bookmarks.filter(
              d => !(d.feedId === feedId && d.itemId === itemId),
            ),
          }));
          return false;
        }
        set(state => ({
          bookmarks: state.bookmarks.concat({ feedId, itemId }),
        }));
        return true;
      },
    }),
    {
      name: 'feedit-bookmarks',
      storage: createJSONStorage(() => chunkAsyncStore),
    },
  ),
);

type BookmarkFeedT = FeedItem & { feedId: string };
const bookmarkFeedStore = derive<BookmarkFeedT[]>(get => {
  const bookmarks = get(useBookmarkStore).bookmarks;
  const feeds = get(useFeedStore).feeds;

  return feeds
    .map(feed => {
      return feed.items.map(item => {
        const inBookmark = bookmarks.some(
          bm => bm.feedId === feed.id && bm.itemId === item.id,
        );
        return inBookmark
          ? {
              ...item,
              feedId: feed.id,
            }
          : null;
      });
    })
    .flat(2)
    .filter(d => d) as BookmarkFeedT[];
});

export const useBookmarkFeedStore = () => useStore(bookmarkFeedStore);
