import "react-native-get-random-values";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseFeed } from "@rowanmanning/feed-parser";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type FeedItem = {
  id: string;
  link: string;
  published?: string;
  title: string;
  unread?: boolean;
};

export type Feed = {
  id: string;
  title: string;
  link: string;
  items: FeedItem[];
  isLoading?: boolean;
};

type FeedState = {
  feeds: Feed[];
  addFeed: (rss: string) => void;
  removeFeed: (id: string) => void;
  markItemUnread: (feedId: string, itemId: string, unread: boolean) => void;
  markAllUnread: (feedId: string, unread: boolean) => void;
  syncFeed: (id: string) => void;
  syncAll: () => void;
};

export const useFeedStore = create<FeedState>()(persist((set, get) => ({
  feeds: [],
  addFeed: async (rss: string) => {
    const rssString = await fetch(rss).then((d) => d.text());
    const feed = parseRSS(rssString);
    set((state) => ({
      feeds: [...state.feeds, { ...feed, isLoading: false }] as Feed[],
    }));
  },
  removeFeed: (id: string) => {
    set((state) => ({ feeds: state.feeds.filter((f) => f.id !== id) }));
  },
  markAllUnread(feedId, unread) {
    set((state) => ({
      feeds: state.feeds.map((f) =>
        f.id === feedId
          ? { ...f, items: f.items.map((d) => ({ ...d, unread })) }
          : f
      ),
    }));
  },
  markItemUnread: (feedId, itemId, unread) => {
    set((state) => ({
      feeds: state.feeds.map((feed) =>
        feed.id === feedId
          ? {
            ...feed,
            items: feed.items.map((item) =>
              item.id === itemId ? { ...item, unread } : item
            ),
          }
          : feed
      ),
    }));
  },
  syncAll: async () => {
    set((s) => ({
      feeds: s.feeds.map((d) => ({ ...d, "isLoading": true })),
    }));
    const feeds = await Promise.all(
      get().feeds.map(async (d) => {
        const response = await fetch(d.link).then((d) => d.text());
        const feed = parseRSS(response);
        const newItems = d.items.filter((x) =>
          !feed.items.some((y) => y.id === x.id)
        );
        return {
          ...feed,
          id: d.id,
          isLoading: false,
          items: d.items.concat(newItems).sort(sortByPublished),
        };
      }),
    );
    set({
      feeds: feeds as any,
    });
  },
  syncFeed: async (id) => {
    const currentFeed = get().feeds.find((d) => d.id === id);
    if (!currentFeed) return;

    const rssText = await fetch(currentFeed.link).then((d) => d.text());
    const feed = parseRSS(rssText);

    const updatedItems = feed.items
      .filter((x) => !currentFeed.items.some((z) => z.id === x.id))
      .concat(currentFeed.items).sort(sortByPublished);

    set((state) => ({
      feeds: state.feeds.map((f) =>
        f.id === id
          ? {
            ...currentFeed,
            items: updatedItems,
            isLoading: false,
          }
          : f
      ) as Feed[],
    }));
  },
}), {
  name: "feedit",
  storage: createJSONStorage(() => AsyncStorage),
}));

function parseRSS(str: string) {
  const feed = parseFeed(str);
  return {
    id: nanoid(),
    title: feed.title || feed.url,
    link: feed.url,
    items: Array.isArray(feed.items)
      ? feed.items.map((d: any) => {
        let link = "";
        if (d.id || d.url) {
          if (d.url) link = d.url;
          else {
            try {
              link = new URL(d.id ?? "", feed.url ?? undefined).href;
            } catch (err) {
              link = d.id;
            }
          }
        }
        return {
          id: d.id,
          link: link,
          published: d.published,
          title: typeof d.title === "string" ? d.title : "",
          unread: true,
        };
      })
      : [],
  };
}

const sortByPublished = (y, x) =>
  new Date(y.published).getTime() - new Date(x.published).getTime();
