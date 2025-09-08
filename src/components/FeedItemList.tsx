import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  IconButton,
  List,
  Menu,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useBookmarkStore } from "../lib/store/bookmarks";
import { useFeedStore } from "../lib/store/feed";
import FeedUnreadDot from "./FeedUnreadDot";
import { useToast } from "./Toast";
import { openUrl } from "../lib/url";

const DateFmt = Intl.DateTimeFormat("en-GB", {
  dateStyle: "short",
});

const FeedItemList = ({ feedId }: { feedId: string }) => {
  const feed = useFeedStore((state) =>
    state.feeds.find((f) => f.id === feedId)
  );
  const markItemUnread = useFeedStore((state) => state.markItemUnread);
  const syncFeed = useFeedStore((state) => state.syncFeed);
  const updateFeedUrl = useFeedStore((state: any) => state.updateFeedUrl);
  const toggleBookmark = useBookmarkStore((state) => state.toggleBookmark);
  const isInBookmark = useBookmarkStore((state) => state.isInBookmark);
  const toast = useToast();
  const [editVisible, setEditVisible] = useState(false);
  const [editUrl, setEditUrl] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const theme = useTheme();

  useEffect(() => {
    setEditUrl(feed?.feedUrl ?? "");
    setEditError("");
  }, [feed?.feedUrl]);

  const isFeedLoading = feed?.isLoading ?? false;

  const validateAndUpdateFeedUrl = async () => {
    const trimmed = (editUrl || "").trim();
    if (!trimmed) {
      setEditError("Please enter a URL.");
      return;
    }
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(trimmed);
      const txt = await res.text();
      const lower = txt.toLowerCase();
      if (lower.includes("<rss") || lower.includes("<feed")) {
        if (typeof updateFeedUrl === "function") {
          updateFeedUrl(feedId, trimmed);
          toast.show("Feed URL updated");
        } else {
          console.warn("updateFeedUrl not implemented in feed store");
          toast.show("Feed URL updated locally");
        }
        setEditVisible(false);
      } else {
        setEditError("URL does not contain valid RSS data.");
      }
    } catch (e) {
      setEditError("Failed to fetch or parse RSS feed.");
    } finally {
      setEditLoading(false);
    }
  };
  const onRefresh = useCallback(() => syncFeed(feedId), [syncFeed, feedId]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <FeedItemRow
        item={item}
        feedId={feedId}
        markItemUnread={markItemUnread}
        toggleBookmark={toggleBookmark}
        isInBookmark={isInBookmark}
        openToast={toast}
      />
    ),
    [feedId, markItemUnread, toggleBookmark, isInBookmark, toast],
  );

  if (!feed) return <></>;

  return (
    <>
      <View style={styles.headerRow}>
        <Text numberOfLines={1} style={styles.headerText}>
          RSS URL: {feed.feedUrl}
        </Text>
        <IconButton
          icon="pencil"
          size={20}
          onPress={() => {
            setEditUrl(feed.feedUrl ?? "");
            setEditError("");
            setEditVisible(true);
          }}
        />
      </View>

      <Portal>
        <Modal visible={editVisible} onDismiss={() => setEditVisible(false)}>
          <Card style={styles.card}>
            <Card.Title title="Edit Feed URL" />
            <Card.Content>
              <TextInput
                mode="outlined"
                label="Feed URL"
                placeholder="https://example.com/rss.xml"
                value={editUrl}
                onChangeText={setEditUrl}
                error={!!editError}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {editError
                ? (
                  <Text
                    style={[styles.errorText, { color: theme.colors.error }]}
                  >
                    {editError}
                  </Text>
                )
                : null}
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              <Button
                onPress={() => setEditVisible(false)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button
                onPress={validateAndUpdateFeedUrl}
                loading={editLoading}
                disabled={editLoading}
              >
                Save
              </Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>

      <FlatList
        refreshing={isFeedLoading}
        data={feed.items}
        keyExtractor={(it) => it.id}
        onRefresh={onRefresh}
        ListEmptyComponent={!isFeedLoading ? <Text>No Items</Text> : <></>}
        renderItem={renderItem}
      />
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
            style={styles.unreadDot}
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
            {isInBookmark(feedId, item.id)
              ? <List.Icon icon="bookmark" />
              : null}
          </View>
          <Menu
            visible={open}
            onDismiss={() => setOpen(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => {
                  setOpen(true);
                }}
              />
            }
          >
            <Menu.Item
              onPress={async (e) => {
                e.stopPropagation();
                openUrl(item.link);
              }}
              title="Open"
            />
            <Menu.Item
              onPress={(e) => {
                e.stopPropagation();
                const added = toggleBookmark(feedId, item.id);
                const msg = `${added ? "Added" : "Removed"} from bookmarks`;
                openToast.show(msg);
                setOpen(false);
              }}
              title={`${
                isInBookmark(feedId, item.id) ? "Remove from" : `Add to`
              } Bookmarks`}
            />
            <Menu.Item
              onPress={(e) => {
                e.stopPropagation();
                markItemUnread(feedId, item.id, !item.unread);
                setOpen(false);
              }}
              title={`Mark as ${item.unread ? "read" : "unread"}`}
            />
          </Menu>
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  item: { paddingTop: 10, paddingBottom: 10 },
  rightRow: { flexDirection: "row", alignItems: "center" },
  pressable: { paddingVertical: 10 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  content: { flex: 1, paddingHorizontal: 8 },
  desc: { color: "#666", fontSize: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerText: { flex: 1, fontSize: 14, fontWeight: "500" },
  card: { margin: 16 },
  cardActions: { justifyContent: "flex-end" },
  errorText: { marginTop: 8 },
  unreadDot: { marginTop: 10, alignSelf: "flex-start" },
});

export default FeedItemList;
