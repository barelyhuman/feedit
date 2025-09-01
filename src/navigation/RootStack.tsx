import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomePage from "../pages/HomePage";
import FeedPage from "../pages/FeedPage";
import SettingsPage from "../pages/SettingsPage";

const RootStack = createNativeStackNavigator({
  initialRouteName: "Home",
  screens: {
    Home: HomePage,
    Feed: FeedPage,
    Settings: SettingsPage,
  },
  screenOptions: {
    headerShown: false,
  },
});

export default RootStack;
