import { useState } from 'react';
import { FlatList, Linking, View } from 'react-native';
import { List, Menu, Text, useTheme } from 'react-native-paper';
import { useBookmarkStore } from '../lib/store/bookmarks';
import { useFeedStore } from '../lib/store/feed';
import FeedUnreadDot from './FeedUnreadDot';
import WebViewThatOpensLinksInNavigator from './WebViewNavigator';
import { useToast } from './Toast';

const DateFmt = Intl.DateTimeFormat('en-GB', {
  dateStyle: 'short',
});

const FeedItemList = ({ feedId }: { feedId: string }) => {
  const theme = useTheme();
  const feed = useFeedStore(state => state.feeds.find(f => f.id === feedId));
  const markItemUnread = useFeedStore(state => state.markItemUnread);
  const syncFeed = useFeedStore(state => state.syncFeed);
  const toggleBookmark = useBookmarkStore(state => state.toggleBookmark);
  const isInBookmark = useBookmarkStore(state => state.isInBookmark);
  const [showWebview, setShowWebview] = useState<string | null>();
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const toast = useToast();
  if (!feed) return <></>;
  const isFeedLoading = feed.isLoading;
  return (
    <>
      <View>
        <FlatList
          refreshing={isFeedLoading}
          data={feed.items}
          keyExtractor={it => it.id}
          onRefresh={() => {
            syncFeed(feedId);
          }}
          ListEmptyComponent={!isFeedLoading ? <Text>No Items</Text> : <></>}
          renderItem={({ item }) => (
            <View>
              <Menu
                visible={openMenuId === item.id}
                anchorPosition="top"
                style={{ top: menuPosition.y, left: menuPosition.x }}
                onDismiss={() => setOpenMenuId(null)}
                anchor={
                  <List.Item
                    style={{ paddingTop: 10, paddingBottom: 10 }}
                    left={props => (
                      <FeedUnreadDot
                        style={props.style}
                        unread={!!item.unread}
                        theme={theme}
                      />
                    )}
                    right={props => {
                      return isInBookmark(feed.id, item.id) ? (
                        <List.Icon icon="bookmark" {...props} />
                      ) : null;
                    }}
                    title={item.title}
                    description={
                      item.published
                        ? DateFmt.format(new Date(item.published))
                        : item.link
                    }
                    onLongPress={event => {
                      setMenuPosition({
                        x: event.nativeEvent.pageX,
                        y: event.nativeEvent.pageY,
                      });
                      setOpenMenuId(item.id);
                    }}
                    onPress={async () => {
                      if (!item.link.trim()) return;
                      const canOpen = await Linking.canOpenURL(item.link);
                      if (!canOpen) return;
                      markItemUnread(feed.id, item.id, false);
                      // Linking.openURL(item.link);
                      setShowWebview(item.link.trim());
                    }}
                  />
                }
              >
                <Menu.Item
                  onPress={() => {
                    setShowWebview(item.link);
                  }}
                  title="Open"
                />
                <Menu.Item
                  onPress={() => {
                    const added = toggleBookmark(feed.id, item.id);
                    const msg = `${added ? 'Added' : 'Removed'} from bookmarks`;
                    toast.show(msg);
                    setOpenMenuId(null);
                  }}
                  title={`${
                    isInBookmark(feed.id, item.id) ? 'Remove from' : `Add to`
                  } Bookmarks`}
                />
                <Menu.Item
                  onPress={() => {
                    markItemUnread(feed.id, item.id, false);
                    setOpenMenuId(null);
                  }}
                  title="Mark as Read"
                />
              </Menu>
            </View>
          )}
        />
      </View>
      {showWebview && <WebViewThatOpensLinksInNavigator uri={showWebview} />}
    </>
  );
};

export default FeedItemList;
