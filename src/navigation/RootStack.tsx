import Icon from '@react-native-vector-icons/material-design-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomNavigation } from 'react-native-paper';
import BookmarkPage from '../pages/BookmarksPage';
import FeedPage from '../pages/FeedPage';
import HomePage from '../pages/HomePage';
import SettingsPage from '../pages/SettingsPage';

const HomeStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: HomePage,
    Feed: FeedPage,
    Settings: SettingsPage,
  },
  screenOptions: {
    headerShown: false,
  },
});

const Tabs = createBottomTabNavigator({
  screens: {
    Home: {
      screen: HomeStack,
      options: {
        title: 'Feeds',
        tabBarIcon: ({ color }) => <Icon name="rss" color={color} size={26} />,
      },
    },
    Bookmarks: {
      screen: BookmarkPage,
      options: {
        tabBarIcon: ({ color }) => (
          <Icon name="bookmark" color={color} size={26} />
        ),
      },
    },
  },
  screenOptions: {
    animation: 'shift',
    headerShown: false,
  },
  tabBar: ({ navigation, state, descriptors, insets }) => (
    <BottomNavigation.Bar
      navigationState={state}
      safeAreaInsets={insets}
      onTabPress={({ route, preventDefault }) => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        if (event.defaultPrevented) {
          preventDefault();
        } else {
          navigation.dispatch({
            ...CommonActions.navigate(route.name, route.params),
            target: state.key,
          });
        }
      }}
      renderIcon={({ route, focused, color }) =>
        descriptors[route.key].options.tabBarIcon?.({
          focused,
          color,
          size: 24,
        }) || null
      }
      getLabelText={({ route }) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
            ? options.title
            : route.name;

        return label;
      }}
    />
  ),
});

export default Tabs;
