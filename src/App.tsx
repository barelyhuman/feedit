import {
  DefaultTheme,
  NavigationContainer,
  Route,
  useNavigation,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { XMLParser } from "fast-xml-parser";
import { observer } from "mobx-react-lite";
import { isHydrated, makePersistable } from "mobx-persist-store";
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

import Icon from "@react-native-vector-icons/material-design-icons";
import { action, makeAutoObservable, observable } from "mobx";
import { useEffect, useState } from "react";
import {
  Animated,
  FlatList,
  Linking,
  StatusBar,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

let feedIdCounter = 0;
class FeedItem {
  title: string;
  link = "";
  unread = true;
  constructor(title: string, link?: string) {
    this.title = title;
    if (link) this.link = link;
    makeAutoObservable(this);
  }

  toggleRead(bool: boolean) {
    this.unread = bool;
  }
}

class FeedCollection {
  collection: Feed[] = [];

  constructor() {
    makeAutoObservable(this);
    makePersistable(this, {
      name: "FeedCollection",
      properties: ["collection"],
      stringify: true,
      storage: AsyncStorage,
    }, { delay: 200, fireImmediately: false }).then(action((store) => {
      if (store.isHydrated) {
        this.cleanUp();
      }
    }));
  }

  get isHydrated() {
    return isHydrated(this);
  }

  add(url: string) {
    if (this.collection.some((d) => d.url === url)) return;
    const feed = new Feed(url);
    this.collection.push(feed);
    return feed.id;
  }

  sync(id: number) {
    const f = this.collection.find((d) => d.id === id);
    if (!f) return;
    return f.sync();
  }

  cleanUp() {
    const set = new Set<string>();
    this.collection.forEach((d) => {
      if (d.url) set.add(d.url);
    });
    this.collection = [];
    [...set.entries()].forEach((d) => this.add(d[0]));
  }
}

class Feed {
  id: number;
  url: string = "";
  title: string = "";
  items: FeedItem[] = [];
  state: "loading" | "idle" = "idle";

  constructor(url: string) {
    this.id = ++feedIdCounter;
    this.url = url;
    this.title = url;
    makeAutoObservable(this, {
      sync: action,
      items: observable,
      title: observable,
    });
  }

  get unread() {
    return this.items.reduce((acc, i) => {
      return acc + (i.unread ? 1 : 0);
    }, 0);
  }

  setLoading(bool: boolean) {
    this.state = bool ? "loading" : "idle";
  }
  updateTitle(title: string) {
    this.title = title;
  }
  updateItems(items: FeedItem[]) {
    this.items = items;
  }

  async sync() {
    try {
      this.setLoading(true);

      const response = await fetch(this.url).then((d) => d.text());
      const feed = parseRSS(response);
      this.updateTitle(feed.title || this.url);
      this.title = feed.title || this.url;
      const items = feed.items.sort((y, x) =>
        new Date(x.published).getTime() - new Date(y.published).getTime()
      ).map((d) => {
        const link = d.link;
        return new FeedItem(
          d.title,
          link || "",
        );
      });
      this.updateItems(items);
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      this.setLoading(false);
    }
  }
}

const feedColl = new FeedCollection();

if (feedColl.isHydrated) {
  feedColl.cleanUp();
}

const FeedList = observer(({ feedColl }: { feedColl: FeedCollection }) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const [rotateAnim] = useState(() => new Animated.Value(0));

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
  return feedColl.collection.map((feed) => {
    return (
      <TouchableRipple
        onPress={() => {
          navigation.navigate("Feed", { id: feed.id });
        }}
      >
        <List.Item
          key={feed.url}
          title={feed.title}
          right={(props) => {
            return (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {feed.state === "loading"
                  ? (
                    <Animated.View
                      style={{
                        transform: [{ rotate: rotation }],
                      }}
                    >
                      <Icon color={theme.colors.primary} name="loading" />
                    </Animated.View>
                  )
                  : (
                    <Badge>
                      {feed.unread}
                    </Badge>
                  )}
                <List.Icon {...props} icon="arrow-right" />
              </View>
            );
          }}
        />
      </TouchableRipple>
    );
  });
});

const FeedItemList = observer(({ feed }: { feed?: Feed }) => {
  const theme = useTheme();

  useEffect(() => {
    if (feed) feed.sync();
  }, []);

  if (!feed) return <></>;

  const isFeedLoading = feed.state === "loading";

  return (
    <FlatList
      refreshing={isFeedLoading}
      data={feed.items}
      onRefresh={() => feed.sync()}
      ListEmptyComponent={!isFeedLoading ? <Text>No Items</Text> : <></>}
      renderItem={({ item }) => {
        return (
          <TouchableOpacity
            onPress={() => {
              if (!item.link.trim()) {
                return;
              }
              if (!Linking.canOpenURL(item.link)) {
                return;
              }
              return Linking.openURL(item.link);
            }}
          >
            <List.Item
              left={({ style }) => (
                <View
                  style={{
                    ...style,
                    height: 12,
                    width: 12,
                    backgroundColor: theme.colors.primary,
                    borderRadius: 1000,
                  }}
                />
              )}
              title={item.title}
            />
          </TouchableOpacity>
        );
      }}
    />
  );
});

const HomePage = () => {
  return (
    <>
      <View>
        <Appbar.Header>
          <Appbar.Content title="FeedIt" />
        </Appbar.Header>
        <FeedList feedColl={feedColl} />
      </View>
      <AddFeedFAB feedColl={feedColl} />
    </>
  );
};

const AddFeedFAB = ({ feedColl }: { feedColl: FeedCollection }) => {
  const [url, setUrl] = useState("");
  const [visible, setVisible] = useState(false);
  const theme = useTheme();

  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);

  return (
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={hideModal}
        >
          <Card style={{ backgroundColor: theme.colors.surface, margin: 10 }}>
            <Card.Title
              titleStyle={{ fontSize: 16, fontWeight: 600 }}
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
            <Card.Actions style={{ marginTop: 10 }}>
              <Button onPress={() => hideModal()}>Cancel</Button>
              <Button
                onPress={() => {
                  feedColl.sync(feedColl.add(url));
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
        style={{ position: "absolute", margin: 16, right: 0, bottom: 0 }}
        onPress={() => showModal()}
      />
    </>
  );
};

const FeedPage = (
  { route }: { route: Route<"Feed" | "Home", { id: number }> },
) => {
  const params = route.params;
  const feed = feedColl.collection.find((d) => d.id === params.id);

  const navigation = useNavigation();

  return (
    <View>
      <Appbar.Header>
        <Appbar.BackAction
          onPress={() => {
            return navigation.navigate("Home");
          }}
        />
        <Appbar.Content title={feed?.title} />
      </Appbar.Header>
      <FeedItemList feed={feed} />
    </View>
  );
};

const RootStack = createNativeStackNavigator();

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationDark: DefaultTheme,
  reactNavigationLight: DefaultTheme,
});

const App = () => {
  const isDarkMode = useColorScheme() === "dark";

  return (
    <PaperProvider>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <NavigationContainer theme={isDarkMode ? DarkTheme : LightTheme}>
        <RootStack.Navigator>
          <RootStack.Screen
            options={{ headerShown: false }}
            name="Home"
            component={HomePage}
          />
          <RootStack.Screen
            options={{ headerShown: false }}
            name="Feed"
            component={FeedPage}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

// feedColl.add("https://manuelmoreale.com/feed/rss");
// feedColl.collection.forEach((d) => d.sync());

function parseRSS(str: string) {
  const parser = new XMLParser();
  const feed = parser.parse(str);

  const feedSource = (() => {
    if ("rss" in feed) {
      return feed.rss.channel;
    }
    if ("feed" in feed) {
      return feed.feed;
    }
  })();

  const feedEntries = Array.isArray(feedSource.item)
    ? feedSource.item
    : Array.isArray(feedSource.entry)
    ? feedSource.entry
    : [];

  return {
    title: feedSource.title,
    link: feedSource.link || feedSource.id,
    items: feedEntries.map((d) => {
      const link = extractLink(d, feedSource.link);
      return {
        id: d.guid || d.id,
        link: link,
        published: d.pubDate,
        title: d.title,
      };
    }),
  };
}

function extractLink(item, base) {
  if ("link" in item) {
    return item.link;
  }
  return new URL(item.guid, base).href;
}

export default App;
