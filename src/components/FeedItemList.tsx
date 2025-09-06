import { useState } from 'react';
import { FlatList, View, StyleSheet, Pressable } from 'react-native';
import {
  List,
  Menu,
  Text,
  useTheme,
  IconButton,
  Divider,
} from 'react-native-paper';
import { useBookmarkStore } from '../lib/store/bookmarks';
import { useFeedStore } from '../lib/store/feed';
import FeedUnreadDot from './FeedUnreadDot';
import { useToast } from './Toast';
import { openUrl } from '../lib/url';

const DateFmt = Intl.DateTimeFormat('en-GB', {
  dateStyle: 'short',
});

const FeedItemList = ({ feedId }: { feedId: string }) => {
  // navigation not used
  const feed = useFeedStore(state => state.feeds.find(f => f.id === feedId));
  const markItemUnread = useFeedStore(state => state.markItemUnread);
  const syncFeed = useFeedStore(state => state.syncFeed);
  const toggleBookmark = useBookmarkStore(state => state.toggleBookmark);
  const isInBookmark = useBookmarkStore(state => state.isInBookmark);
  // menu is handled per-row now
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
            <FeedItemRow
              item={item}
              feedId={feedId}
              markItemUnread={markItemUnread}
              toggleBookmark={toggleBookmark}
              isInBookmark={isInBookmark}
              openToast={toast}
            />
          )}
        />
      </View>
    </>
  );
};

const FeedItemRow = ({
  item,
  feedId,
  markItemUnread,
  toggleBookmark,
  isInBookmark,
  openToast,
}: any) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable
        onPress={async () => {
          if (!item.link.trim()) return;
          markItemUnread(feedId, item.id, false);
          openUrl(item.link);
          return;
        }}
        style={styles.pressable}
      >
        <View style={styles.row}>
          <FeedUnreadDot
            style={{
              marginTop: 10,
              alignSelf: 'start',
            }}
            unread={!!item.unread}
            theme={theme}
          />
          <View style={styles.content}>
            <Text numberOfLines={1}>{item.title}</Text>
            <Text style={styles.desc} numberOfLines={1}>
              {item.published
                ? DateFmt.format(new Date(item.published))
                : item.link}
            </Text>
          </View>
          <View style={styles.rightRow}>
            {isInBookmark(feedId, item.id) ? (
              <List.Icon icon="bookmark" />
            ) : null}
          </View>
          <Menu
            visible={open}
            onDismiss={() => setOpen(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => setOpen(true)}
              />
            }
          >
            <Menu.Item onPress={async () => openUrl(item.link)} title="Open" />
            <Menu.Item
              onPress={() => {
                const added = toggleBookmark(feedId, item.id);
                const msg = `${added ? 'Added' : 'Removed'} from bookmarks`;
                openToast.show(msg);
                setOpen(false);
              }}
              title={`${
                isInBookmark(feedId, item.id) ? 'Remove from' : `Add to`
              } Bookmarks`}
            />
            <Menu.Item
              onPress={() => {
                markItemUnread(feedId, item.id, false);
                setOpen(false);
              }}
              title="Mark as Read"
            />
          </Menu>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  item: { paddingTop: 10, paddingBottom: 10 },
  rightRow: { flexDirection: 'row', alignItems: 'center' },
  pressable: { paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  content: { flex: 1, paddingHorizontal: 8 },
  desc: { color: '#666', fontSize: 12 },
});

export default FeedItemList;
