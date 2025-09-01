import { FlatList, TouchableOpacity, Linking } from "react-native";
import { Text, List, useTheme } from "react-native-paper";
import { useFeedStore } from "../lib/reactive";
import FeedUnreadDot from "./FeedUnreadDot";

const FeedItemList = ({ feedId }: { feedId: string }) => {
  const theme = useTheme();
  const feed = useFeedStore((state) =>
    state.feeds.find((f) => f.id === feedId)
  );
  const markItemUnread = useFeedStore((state) => state.markItemUnread);
  const syncFeed = useFeedStore((state) => state.syncFeed);
  if (!feed) return <></>;
  const isFeedLoading = feed.isLoading;
  return (
    <FlatList
      refreshing={isFeedLoading}
      data={feed.items}
      onRefresh={() => {
        syncFeed(feedId);
      }}
      ListEmptyComponent={!isFeedLoading ? <Text>No Items</Text> : <></>}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => {
            if (!item.link.trim()) return;
            markItemUnread(feed.id, item.id, false);
            Linking.canOpenURL(item.link).then((canOpen) => {
              if (!canOpen) return;
              Linking.openURL(item.link);
            });
          }}
        >
          <List.Item
            left={(props) => (
              <FeedUnreadDot
                style={props.style}
                unread={item.unread}
                theme={theme}
              />
            )}
            title={item.title}
          />
        </TouchableOpacity>
      )}
    />
  );
};

export default FeedItemList;
