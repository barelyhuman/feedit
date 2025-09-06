import 'react-native-get-random-values';

import { parseFeed } from '@rowanmanning/feed-parser';
import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { chunkAsyncStore } from '../chunkAsyncStore';

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
};

export const useFeedStore = create<FeedState>()(
  persist(
    (set, get) => ({
      feeds: [],
      addFeed: async (feedUrl: string) => {
        if (get().feeds.some(d => d.feedUrl === feedUrl)) return;
        const rssString = await fetch(feedUrl).then(d => d.text());
        const feed = parseRSS(rssString);
        feed.items = feed.items.sort(sortByPublished);
        set(state => ({
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
        set(state => ({ feeds: state.feeds.filter(f => f.id !== id) }));
      },
      markAllUnread(feedId, unread) {
        set(state => ({
          feeds: state.feeds.map(f =>
            f.id === feedId
              ? { ...f, items: f.items.map(d => ({ ...d, unread })) }
              : f,
          ),
        }));
      },
      markItemUnread: (feedId, itemId, unread) => {
        set(state => ({
          feeds: state.feeds.map(feed =>
            feed.id === feedId
              ? {
                  ...feed,
                  items: feed.items.map(item =>
                    item.id === itemId ? { ...item, unread } : item,
                  ),
                }
              : feed,
          ),
        }));
      },
      syncAll: async () => {
        set(s => ({
          feeds: s.feeds.map(d => ({ ...d, isLoading: true })),
        }));

        const feeds = await Promise.all(
          get().feeds.map(async d => {
            if (!d.feedUrl) return;
            const response = await fetch(d.feedUrl).then(d => d.text());
            const feed = parseRSS(response);

            const items = feed.items
              .map(x => {
                const existingItem = d.items.find(y => y.id === x.id);
                return Object.assign({}, existingItem, x, {
                  unread: existingItem?.unread,
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
      },
      sequentialBackgroundSync: async () => {
        for (const feedItem of get().feeds) {
          if (!feedItem.feedUrl) return;
          const response = await fetch(feedItem.feedUrl).then(d => d.text());
          const feed = parseRSS(response);

          const items = feed.items
            .map(x => {
              const existingItem = feedItem.items.find(y => y.id === x.id);
              return Object.assign({}, existingItem, x, {
                unread: existingItem?.unread,
              });
            })
            .sort(sortByPublished);

          set(state => ({
            feeds: state.feeds.map(existingFeed => {
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
      syncFeed: async id => {
        const currentFeed = get().feeds.find(d => d.id === id);
        if (!currentFeed) return;

        const rssText = await fetch(currentFeed.feedUrl).then(d => d.text());
        const feed = parseRSS(rssText);

        const updatedItems = feed.items
          .filter(x => !currentFeed.items.some(z => z.id === x.id))
          .concat(currentFeed.items)
          .sort(sortByPublished);

        set(state => ({
          feeds: state.feeds.map(f =>
            f.id === id
              ? {
                  ...currentFeed,
                  items: updatedItems,
                  isLoading: false,
                }
              : f,
          ) as Feed[],
        }));
      },
    }),
    {
      name: 'feedit',
      storage: createJSONStorage(() => chunkAsyncStore),
      partialize: state => ({
        feeds: state.feeds,
      }),
      onRehydrateStorage: state => {
        return (_, error) => {
          if (error) {
            console.error(error);
          } else {
            console.log('hydration finished');
          }
        };
      },
    },
  ),
);

function parseRSS(str: string) {
  const feed = parseFeed(str);
  return {
    id: nanoid(),
    title: feed.title || feed.url,
    link: feed.url,
    items: Array.isArray(feed.items)
      ? feed.items.map((d: any) => {
          let link = '';
          if (d.id || d.url) {
            if (d.url) link = d.url;
            else {
              try {
                link = new URL(d.id ?? '', feed.url ?? undefined).href;
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
            title: typeof d.title === 'string' ? d.title : '',
            unread: true,
          };
        })
      : [],
  };
}

const sortByPublished = (y, x) => {
  return new Date(x.published).getTime() - new Date(y.published).getTime();
};
