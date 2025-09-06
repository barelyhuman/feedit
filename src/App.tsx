import { StatusBar, useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import Navigation from './navigation/Navigation';
import { ToastContainer } from './components/Toast';
import { useFeedStore } from './lib/store/feed';
import { useEffect } from 'react';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  const sequentialBackgroundSync = useFeedStore(
    d => d.sequentialBackgroundSync,
  );

  useEffect(() => {
    sequentialBackgroundSync();
  }, [sequentialBackgroundSync]);

  return (
    <PaperProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Navigation isDarkMode={isDarkMode} />
      <ToastContainer />
    </PaperProvider>
  );
};

export default App;
