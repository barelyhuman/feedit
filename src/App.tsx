import Icon from "@react-native-vector-icons/material-design-icons";
import {
  createStaticNavigation,
  DefaultTheme,
  Route,
  useNavigation,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  Animated,
  FlatList,
  Linking,
  StatusBar,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import "react-native-get-random-values";
import {
  adaptNavigationTheme,
  Appbar,
  Badge,
  Button,
  Card,
  FAB,
  List,
  Modal,
  PaperProvider,
  Portal,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useFeedStore } from "./lib/reactive";

const FeedList = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const [rotateAnim] = useState(() => new Animated.Value(0));
  const [selected, setSelected] = useState<string[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);
  const feeds = useFeedStore((state) => state.feeds);
  const removeFeed = useFeedStore((state) => state.removeFeed);

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const syncAll = useFeedStore((state) => state.syncAll);

  const handleSelect = (id: string) => {
    if (!multiSelect) {
      navigation.navigate({
        name: "Feed",
        params: { id },
      });
      return;
    }
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.Content
          title={multiSelect ? `${selected.length} selected` : "FeedIt"}
        />
        <Appbar.Action
          icon="refresh"
          onPress={() => {
            syncAll();
          }}
        />
        {multiSelect && selected.length > 0 && (
          <Appbar.Action
            icon="delete"
            onPress={() => {
              selected.forEach((id) => removeFeed(id));
              setSelected([]);
              setMultiSelect(false);
            }}
          />
        )}
        <Appbar.Action
          icon={multiSelect ? "close" : "checkbox-multiple-marked"}
          onPress={() => {
            setMultiSelect((v) => !v);
            if (multiSelect) setSelected([]);
          }}
        />
      </Appbar.Header>
      {feeds.map((feed) => {
        const isSelected = selected.includes(feed.id);
        return (
          <TouchableRipple
            key={`feed-${feed.id}`}
            onPress={() => handleSelect(feed.id)}
            onLongPress={() => {
              setMultiSelect(true);
              setSelected([feed.id]);
            }}
            style={isSelected
              ? [{
                backgroundColor: theme.colors.onBackground,
              }]
              : null}
          >
            <List.Item
              title={feed.title}
              titleStyle={{
                color: isSelected
                  ? theme.colors.background
                  : theme.colors.onBackground,
              }}
              left={multiSelect
                ? ((props) => (
                  <FeedSelectIcon {...props} selected={isSelected} />
                ))
                : undefined}
              right={(props) => (
                <FeedRightIcons
                  {...props}
                  feed={feed}
                  multiSelect={multiSelect}
                  rotation={rotation}
                  theme={theme}
                />
              )}
            />
          </TouchableRipple>
        );
      })}
    </>
  );
};

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

const HomePage = () => {
  return (
    <>
      <FeedList />
      <AddFeedFAB />
    </>
  );
};

const AddFeedFAB = () => {
  const [url, setUrl] = useState("");
  const [visible, setVisible] = useState(false);
  const theme = useTheme();
  const addFeed = useFeedStore((state) => state.addFeed);
  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);
  return (
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={hideModal}
        >
          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Title
              titleStyle={styles.cardTitle}
              title={"Add Feed"}
            />
            <Card.Content>
              <TextInput
                mode="outlined"
                label="Feed URL"
                placeholder="https://reaper.is/rss.xml"
                value={url}
                onChangeText={setUrl}
              />
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              <Button onPress={() => hideModal()}>Cancel</Button>
              <Button
                onPress={() => {
                  if (url.trim()) {
                    addFeed(url);
                  }
                  setUrl("");
                  hideModal();
                }}
              >
                Ok
              </Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => showModal()}
      />
    </>
  );
};

const FeedPage = (
  { route }:
    & { route: Route<"Feed" | "Home", { id: string }> }
    & Record<any, unknown>,
) => {
  const params = route.params;
  const navigation = useNavigation();
  const feed = useFeedStore((state) =>
    state.feeds.find((f) => f.id === params.id)
  );
  if (!feed) return <Text>Not found</Text>;
  return (
    <View>
      <Appbar.Header>
        <Appbar.BackAction
          onPress={() => {
            navigation.navigate({ name: "Home" });
          }}
        />
        <Appbar.Content title={feed?.title} />
      </Appbar.Header>
      <FeedItemList feedId={params.id} />
    </View>
  );
};

const RootStack = createNativeStackNavigator({
  initialRouteName: "Home",
  screens: {
    Home: HomePage,
    "Feed": FeedPage,
  },
  screenOptions: {
    headerShown: false,
  },
});

const Navigation = createStaticNavigation(RootStack);

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationDark: DefaultTheme,
  reactNavigationLight: DefaultTheme,
});

const App = () => {
  const isDarkMode = useColorScheme() === "dark";

  return (
    <PaperProvider>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <Navigation theme={isDarkMode ? DarkTheme : LightTheme} />
    </PaperProvider>
  );
};

// Helper components and styles

const FeedSelectIcon = (props: any) => (
  <List.Icon
    {...props}
    icon={props.selected ? "check-circle" : "circle-outline"}
  />
);

const FeedRightIcons = (
  { feed, multiSelect, rotation, theme, ...props }: any,
) => (
  <View style={styles.rowCenter}>
    {feed.isLoading
      ? (
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Icon color={theme.colors.primary} name="loading" />
        </Animated.View>
      )
      : <Badge>{feed.items.filter((i: any) => i.unread).length}</Badge>}
    {!multiSelect && <List.Icon {...props} icon="arrow-right" />}
  </View>
);

const FeedUnreadDot = (
  { unread, theme, style }: {
    style: StyleProp<any>;
    unread: boolean;
    theme: any;
  },
) => (
  <View
    style={[style, styles.unreadDot, {
      backgroundColor: unread ? theme.colors.primary : theme.colors.surface,
    }]}
  />
);

const styles = StyleSheet.create({
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadDot: {
    height: 12,
    width: 12,
    borderRadius: 1000,
  },
  card: {
    margin: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardActions: {
    marginTop: 10,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default App;
