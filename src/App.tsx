import { StatusBar, useColorScheme, View } from 'react-native'
import { PaperProvider, Text } from 'react-native-paper'
import Navigation from './navigation/Navigation'
import { ToastContainer } from './components/Toast'
import { useFeedStore } from './lib/store/feed'
import { useBookmarkStore } from './lib/store/bookmarks'
import { useEffect } from 'react'
import { useMigrations } from 'drizzle-orm/op-sqlite/migrator'
import migrations from './lib/db/migrations/migrations'
import { db } from './lib/db'

const App = () => {
  const isDarkMode = useColorScheme() === 'dark'

  const hydrateFeed = useFeedStore(d => d.hydrate)
  const hydrateBookmarks = useBookmarkStore(d => d.hydrate)
  const sequentialBackgroundSync = useFeedStore(d => d.sequentialBackgroundSync)


  const { success, error } = useMigrations(db, migrations)

  useEffect(() => {
    if (!success) return
    Promise.all([hydrateFeed(), hydrateBookmarks()]).then(() => {
      sequentialBackgroundSync()
    })
  }, [success,])

  if (error) {
    return (
      <PaperProvider>
        <View>
          <Text>Migration error: {error.message}</Text>
        </View>
      </PaperProvider>
    );
  }

  if (!success) {
    return <View>
      <Text>Migration is in progress...</Text>
    </View>
  }

  return (
    <PaperProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Navigation isDarkMode={isDarkMode} />
      <ToastContainer />
    </PaperProvider>
  )
}

export default App
