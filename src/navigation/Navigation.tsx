import { createStaticNavigation, DefaultTheme } from '@react-navigation/native';
import { adaptNavigationTheme } from 'react-native-paper';
import RootStack from './RootStack';

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationDark: DefaultTheme,
  reactNavigationLight: DefaultTheme,
});

const Nav = createStaticNavigation(RootStack);

export default function ({ isDarkMode }: { isDarkMode: boolean }) {
  return <Nav theme={isDarkMode ? DarkTheme : LightTheme} />;
}
