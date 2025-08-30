import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type FeedItemMeta = {
  id: string; // unique identifier for the item (guid, link, etc)
  feedUrl: string;
  read: boolean;
  starred?: boolean;
  // add other meta fields as needed
};

export type FeedStore = {
  items: FeedItemMeta[];
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  setItems: (feedUrl: string, newItems: FeedItemMeta[]) => void;
  hydrate: () => Promise<void>;
  clearFeedForUrl: (url: string) => Promise<void>;
};

const FEED_STORAGE_KEY = 'feed_items';

export const useFeedStore = create<FeedStore>((set, get) => ({
  items: [],
  markRead: async (id: string) => {
    const updated = get().items.map(item =>
      item.id === id ? { ...item, read: true } : item,
    );
    set({ items: updated });
    await AsyncStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(updated));
  },
  markUnread: async (id: string) => {
    const updated = get().items.map(item =>
      item.id === id ? { ...item, read: false } : item,
    );
    set({ items: updated });
    await AsyncStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(updated));
  },
  setItems: async (feedUrl: string, newItems: FeedItemMeta[]) => {
    // Merge new items, preserve read/starred state
    const existing = get().items;
    const merged = newItems.map(newItem => {
      const old = existing.find(
        item => item.id === newItem.id && item.feedUrl === feedUrl,
      );
      return old
        ? { ...newItem, read: old.read, starred: old.starred }
        : newItem;
    });
    // Remove items from this feed that are not in newItems
    const filtered = existing.filter(item => item.feedUrl !== feedUrl);
    const all = [...filtered, ...merged];
    set({ items: all });
    await AsyncStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(all));
  },
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(FEED_STORAGE_KEY);
    if (raw) {
      set({ items: JSON.parse(raw) });
    }
  },
  clearFeedForUrl: async (feedUrl: string) => {
    const filtered = get().items.filter(item => item.feedUrl !== feedUrl);
    set({ items: filtered });
    await AsyncStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(filtered));
  },
}));
