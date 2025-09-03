import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Animated, FlatList } from "react-native";
import { Appbar, List, TouchableRipple, useTheme } from "react-native-paper";
import { useFeedStore } from "../lib/store/feed";
import FeedRightIcons from "./FeedRightIcons";
import FeedSelectIcon from "./FeedSelectIcon";

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
          icon="cog"
          onPress={() => {
            navigation.navigate("Settings");
          }}
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
      <FlatList
        data={feeds}
        style={{
          paddingBottom: 25,
        }}
        renderItem={({ item: feed }) => {
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
                ? [{ backgroundColor: theme.colors.onBackground }]
                : null}
            >
              <List.Item
                title={feed.title}
                style={{
                  paddingTop: 10,
                  paddingBottom: 10,
                }}
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
        }}
      />
    </>
  );
};

export default FeedList;
