import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { useFeedStore } from './useFeedStore';

export type ValidationState = 'loading' | 'valid' | 'invalid';
export type Subscription = {
  url: string;
  validation: ValidationState;
};

export type SubStore = {
  subscriptions: Subscription[];
  addUrl: (url: string) => void;
  removeUrl: (url: string) => void;
  removeUrls: (urls: string[]) => void;
  hydrate: () => Promise<void>;
  setValidation: (url: string, state: ValidationState) => void;
};

const STORAGE_KEY = 'subscriptions';

export const useSubStore = create<SubStore>((set, get) => ({
  subscriptions: [],
  addUrl: async (url: string) => {
    if (url && !get().subscriptions.some(sub => sub.url === url)) {
      const newSubs = [...get().subscriptions, { url, validation: 'loading' }];
      set({ subscriptions: newSubs });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSubs));
      // Validate URL
      try {
        const response = await fetch(url);
        const text = await response.text();
        // Simple RSS check: look for <rss or <feed
        if (text.includes('<rss') || text.includes('<feed')) {
          get().setValidation(url, 'valid');
        } else {
          get().setValidation(url, 'invalid');
        }
      } catch {
        get().setValidation(url, 'invalid');
      }
    }
  },
  setValidation: (url: string, state: ValidationState) => {
    const subs = get().subscriptions.map(sub =>
      sub.url === url ? { ...sub, validation: state } : sub,
    );
    set({ subscriptions: subs });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  },
  removeUrl: async (url: string) => {
    const newSubs = get().subscriptions.filter(sub => sub.url !== url);
    set({ subscriptions: newSubs });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSubs));
    // Clear feed items for this url
    useFeedStore.getState().clearFeedForUrl(url);
  },
  removeUrls: async (urlsToRemove: string[]) => {
    const newSubs = get().subscriptions.filter(
      sub => !urlsToRemove.includes(sub.url),
    );
    set({ subscriptions: newSubs });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSubs));
    // Clear feed items for these urls
    const { clearFeedForUrl } = useFeedStore.getState();
    if (clearFeedForUrl) {
      for (const url of urlsToRemove) {
        await clearFeedForUrl(url);
      }
    }
  },
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      set({ subscriptions: JSON.parse(raw) });
    } else {
      set({
        subscriptions: [
          { url: 'https://hnrss.org/frontpage', validation: 'valid' },
        ],
      });
    }
  },
}));
