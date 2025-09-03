import { FlatList, Linking, TouchableOpacity } from "react-native";
import { List, Text, useTheme } from "react-native-paper";
import { useFeedStore } from "../lib/store/feed";
import FeedUnreadDot from "./FeedUnreadDot";

const DateFmt = Intl.DateTimeFormat("en-GB", {
  "dateStyle": "short",
});

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
          onPress={async () => {
            if (!item.link.trim()) return;
            const canOpen = await Linking.canOpenURL(item.link);
            if (!canOpen) return;
            markItemUnread(feed.id, item.id, false);
            Linking.openURL(item.link);
          }}
        >
          <List.Item
            style={{ paddingTop: 10, paddingBottom: 10 }}
            left={(props) => (
              <FeedUnreadDot
                style={props.style}
                unread={item.unread}
                theme={theme}
              />
            )}
            title={item.title}
            description={item.published
              ? DateFmt.format(new Date(item.published))
              : item.description}
          />
        </TouchableOpacity>
      )}
    />
  );
};

export default FeedItemList;
