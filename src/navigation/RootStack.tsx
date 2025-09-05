import { createDrawerNavigator } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { View } from 'react-native';
import { Drawer, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BookmarkPage from '../pages/BookmarsPage';
import FeedPage from '../pages/FeedPage';
import HomePage from '../pages/HomePage';
import SettingsPage from '../pages/SettingsPage';

const DrawerNav = createDrawerNavigator({
  screens: {
    Home: HomePage,
    Feed: FeedPage,
    Settings: SettingsPage,
    Bookmarks: BookmarkPage,
  },
  screenOptions: {
    headerShown: false,
  },
  drawerContent: function Content() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    return (
      <Drawer.Section showDivider={false}>
        <View
          style={{
            ...insets,
            height: 100,
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: 30,
            marginBottom: 60,
          }}
        >
          <Text variant="headlineLarge">FeedIt</Text>
        </View>
        <Drawer.Item
          icon="rss"
          label="Feeds"
          onPress={() => navigation.navigate('Home')}
        />
        <Drawer.Item
          icon="bookmark"
          label="Bookmarks"
          onPress={() => navigation.navigate('Bookmarks')}
        />
      </Drawer.Section>
    );
  },
});

export default DrawerNav;
