import Icon from '@react-native-vector-icons/material-design-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Appbar, IconButton, Menu, Text, useTheme } from 'react-native-paper';
import { useToast } from '../components/Toast';
import { useBookmarkFeedStore, useBookmarkStore } from '../lib/store/bookmarks';
import { openUrl } from '../lib/url';

const DateFmt = Intl.DateTimeFormat('en-GB', {
  dateStyle: 'short',
});

const BookmarkPage = ({}: { route: { params: { id: string } } } & Record<
  any,
  unknown
>) => {
  const theme = useTheme();
  const bookmarkedItems = useBookmarkFeedStore();
  const toast = useToast();

  const toggleBookmark = useBookmarkStore(state => state.toggleBookmark);
  const isInBookmark = useBookmarkStore(state => state.isInBookmark);

  // per-row menu state is used instead of global openMenuId

  return (
    <View>
      <Appbar.Header>
        <Appbar.Content title={'Bookmarks'} />
      </Appbar.Header>
      <FlatList
        keyExtractor={it => it.id}
        data={bookmarkedItems}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: theme.colors.secondary }}>No Bookmarks</Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookmarkRow
            item={item}
            toggleBookmark={toggleBookmark}
            isInBookmark={isInBookmark}
            toast={toast}
          />
        )}
      />
    </View>
  );
};

export default BookmarkPage;

const BookmarkRow = ({ item, toggleBookmark, isInBookmark, toast }: any) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable onPress={() => openUrl(item.link)} style={styles.pressable}>
        <View style={styles.row}>
          <Icon name="bookmark" size={24} color={theme.colors.onSurface} />
          <View style={styles.content}>
            <Text numberOfLines={1}>{item.title}</Text>
            <Text numberOfLines={1} style={styles.desc}>
              {item.published
                ? DateFmt.format(new Date(item.published))
                : item.link}
            </Text>
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
            <Menu.Item onPress={() => openUrl(item.link)} title="Open" />
            <Menu.Item
              onPress={() => {
                const added = toggleBookmark(item.feedId, item.id);
                const msg = `${added ? 'Added' : 'Removed'} from bookmarks`;
                toast.show(msg);
                setOpen(false);
              }}
              title={`${
                isInBookmark(item.feedId, item.id) ? 'Remove from' : `Add to`
              } Bookmarks`}
            />
          </Menu>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  pressable: { paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  content: { flex: 1, paddingHorizontal: 8 },
  desc: { color: '#666', fontSize: 12 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
