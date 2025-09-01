import { StatusBar, useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import Navigation from "./navigation/Navigation";

const App = () => {
  const isDarkMode = useColorScheme() === "dark";
  return (
    <PaperProvider>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <Navigation isDarkMode={isDarkMode} />
    </PaperProvider>
  );
};

export default App;
