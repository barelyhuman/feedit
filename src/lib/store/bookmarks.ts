import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { chunkAsyncStore } from '../chunkAsyncStore';

export type BookmarkStore = {
  bookmarks: { feedId: string; itemId: string }[];
  toggleBookmark: (feedId: string, itemId: string) => void;
};

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    set => ({
      bookmarks: [],
      toggleBookmark: (feedId: string, itemId: string) => {
        return set(state => ({
          bookmarks: state.bookmarks.concat({ feedId, itemId }),
        }));
      },
    }),
    {
      name: 'feedit-bookmarks',
      storage: createJSONStorage(() => chunkAsyncStore),
    },
  ),
);
