import { StatusBar, useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import Navigation from './navigation/Navigation';
import { ToastContainer } from './components/Toast';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <PaperProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Navigation isDarkMode={isDarkMode} />
      <ToastContainer />
    </PaperProvider>
  );
};

export default App;
