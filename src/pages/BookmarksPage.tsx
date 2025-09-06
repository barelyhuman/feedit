import Icon from '@react-native-vector-icons/material-design-icons';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Appbar, List, Menu, Text, useTheme } from 'react-native-paper';
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

  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <View>
      <Appbar.Header>
        <Appbar.Content title={'Bookmarks'} />
      </Appbar.Header>
      <FlatList
        keyExtractor={it => it.id}
        data={bookmarkedItems}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.secondary }}>No Bookmarks</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View>
            <Menu
              visible={openMenuId === item.id}
              anchorPosition="top"
              style={{ top: menuPosition.y, left: menuPosition.x }}
              onDismiss={() => {
                setMenuPosition({
                  x: 0,
                  y: 0,
                });
                setOpenMenuId(null);
              }}
              anchor={
                <List.Item
                  style={{ paddingTop: 10, paddingBottom: 10 }}
                  left={props => <Icon name="bookmark" {...props} />}
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
                  onPress={() => {
                    if (!item.link.trim()) return;
                    openUrl(item.link);
                  }}
                />
              }
            >
              <Menu.Item
                onPress={() => {
                  openUrl(item.link);
                }}
                title="Open"
              />
              <Menu.Item
                onPress={() => {
                  const added = toggleBookmark(item.feedId, item.id);
                  const msg = `${added ? 'Added' : 'Removed'} from bookmarks`;
                  toast.show(msg);
                }}
                title={`${
                  isInBookmark(item.feedId, item.id) ? 'Remove from' : `Add to`
                } Bookmarks`}
              />
            </Menu>
          </View>
        )}
      />
    </View>
  );
};

export default BookmarkPage;
