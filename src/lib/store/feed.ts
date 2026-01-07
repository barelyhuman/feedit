import "react-native-get-random-values";

import { parseFeed } from "@rowanmanning/feed-parser";

import { nanoid } from "nanoid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { chunkAsyncStore } from "../chunkAsyncStore";

type ParsedFeed = ReturnType<typeof parseFeed>;

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
  feedUrl: string;
  link: string;
  items: FeedItem[];
  isLoading?: boolean;
};

type FeedState = {
  feeds: Feed[];
  addFeed: (rss: string) => Promise<void>;
  removeFeed: (id: string) => void;
  markItemUnread: (feedId: string, itemId: string, unread: boolean) => void;
  markAllUnread: (feedId: string, unread: boolean) => void;
  syncFeed: (id: string) => void;
  syncAll: () => Promise<void>;
  sequentialBackgroundSync: () => Promise<void>;
  updateFeedUrl: (feedId: string, url: string) => Promise<void>;
};

let isSyncingAll = false;
const syncingFeeds = new Set<string>();

export const useFeedStore = create<FeedState>()(
  persist(
    (set, get) => ({
      feeds: [],
      addFeed: async (feedUrl: string) => {
        if (get().feeds.some((d) => d.feedUrl === feedUrl)) return;
        const rssString = await fetch(feedUrl).then((d) => d.text());
        const feed = parseRSS(rssString, feedUrl);
        feed.items = feed.items.sort(sortByPublished);
        set((state) => ({
          feeds: [
            ...state.feeds,
            {
              ...feed,
              feedUrl: feedUrl,
              isLoading: false,
            },
          ] as Feed[],
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
        if (isSyncingAll) {
          return;
        }
        isSyncingAll = true;

        try {
          set((s) => ({
            feeds: s.feeds.map((d) => ({ ...d, isLoading: true })),
          }));

          const feeds = await Promise.all(
            get().feeds.map(async (d) => {
              if (!d.feedUrl) return;
              const response = await fetch(d.feedUrl).then((res) => res.text());
              const feed = parseRSS(response, d.feedUrl);

              const items = feed.items
                .map((x) => {
                  const existingItem = d.items.find((y) => y.id === x.id);
                  return Object.assign({}, existingItem, x, {
                    unread: existingItem?.unread ?? true,
                  });
                })
                .sort(sortByPublished);

              return {
                ...feed,
                id: d.id,
                feedUrl: d.feedUrl,
                isLoading: false,
                items: items,
              };
            }),
          );
          set({
            feeds: feeds as any,
          });
        } finally {
          isSyncingAll = false;
        }
      },
      sequentialBackgroundSync: async () => {
        for (const feedItem of get().feeds) {
          if (!feedItem.feedUrl) return;
          const response = await fetch(feedItem.feedUrl).then((d) => d.text());
          const feed = parseRSS(response, feedItem.feedUrl);

          const items = feed.items
            .map((x) => {
              const existingItem = feedItem.items.find((y) => y.id === x.id);
              return Object.assign({}, existingItem, x, {
                unread: existingItem?.unread ?? true,
              });
            })
            .sort(sortByPublished);

          set((state) => ({
            feeds: state.feeds.map((existingFeed) => {
              return existingFeed.id === feedItem.id
                ? {
                  ...existingFeed,
                  id: feedItem.id,
                  feedUrl: feedItem.feedUrl,
                  isLoading: false,
                  items: items,
                }
                : existingFeed;
            }),
          }));
        }
      },
      syncFeed: async (id) => {
        if (syncingFeeds.has(id)) {
          return;
        }
        syncingFeeds.add(id);

        try {
          const currentFeed = get().feeds.find((d) => d.id === id);
          if (!currentFeed) return;

          set((state) => ({
            feeds: state.feeds.map((f) =>
              f.id === id
                ? {
                  ...f,
                  isLoading: true,
                }
                : f
            ) as Feed[],
          }));

          const rssText = await fetch(currentFeed.feedUrl).then((d) => d.text());
          const feed = parseRSS(rssText, currentFeed.feedUrl);

          const mergedItems = feed.items.map((d) => {
            const currentItemState = currentFeed.items.find((x) => x.id === d.id);
            return {
              ...currentItemState,
              ...d,
              unread: currentItemState?.unread ?? true ,
            };
          }).sort(sortByPublished);

          set((state) => ({
            feeds: state.feeds.map((f) =>
              f.id === id
                ? {
                  ...currentFeed,
                  items: mergedItems,
                  isLoading: false,
                }
                : f
            ) as Feed[],
          }));
        } finally {
          syncingFeeds.delete(id);
        }
      },
      async updateFeedUrl(feedId: string, url: string) {
        set((state) => ({
          feeds: state.feeds.map((d) =>
            d.id === feedId
              ? {
                ...d,
                feedUrl: url,
              }
              : d
          ),
        }));
        get().syncFeed(feedId);
        return;
      },
    }),
    {
      name: "feedit",
      storage: createJSONStorage(() => chunkAsyncStore),
      partialize: (state) => ({
        feeds: state.feeds,
      }),
      onRehydrateStorage: () => {
        return (_, error) => {
          if (error) {
            console.error(error);
          } else {
            console.log("hydration finished");
          }
        };
      },
    },
  ),
);

function parseRSS(str: string, feedUrl: string) {
  const feed = parseFeed(str);
  let baseURL = feed.url;

  if (feed.url) {
    const fullFeedUrl = new URL(feedUrl).origin;
    baseURL = getBaseURL(feed, fullFeedUrl);
  }

  return {
    id: nanoid(),
    title: feed.title || feed.url,
    link: baseURL,
    items: Array.isArray(feed.items)
      ? feed.items.map((d: any) => {
        let link = "";
        if (d.id || d.url) {
          if (d.url) {
            if (parseURL(d.url)) {
              link = d.url;
            }
            if (d.url.startsWith("/")) {
              link = parseURL(d.url, baseURL);
            }
          } else {
            try {
              link = new URL(d.id ?? "", baseURL ?? undefined).href;
            } catch (err) {
              link = d.id;
            }
          }
        }
        return {
          id: d.id,
          link: link,
          description: d.description || d.content,
          published: d.published || d.updated,
          title: typeof d.title === "string" ? d.title : "",
          unread: true,
        };
      })
      : [],
  };
}

function getBaseURL(feed: ParsedFeed, feedURL: string) {
  if (!feed.url) return "";

  if (feed.url.startsWith("/")) {
    return parseURL(feed.url, feedURL);
  }

  if (parseURL(feed.url)) {
    return feed.url;
  }

  return "";
}

const sortByPublished = (y: FeedItem, x: FeedItem) => {
  if (x.published && y.published) {
    return new Date(x.published).getTime() - new Date(y.published).getTime();
  }
  return 0;
};

function parseURL(str: string, base?: string) {
  try {
    return new URL(str, base).href;
  } catch (err) {
    return "";
  }
}
