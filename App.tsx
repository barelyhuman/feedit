import React, { useEffect, useState } from 'react';
import { pick as pickFile, types } from '@react-native-documents/picker';
import xml2js from 'react-native-xml2js';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {
  FlatList,
  Linking,
  StatusBar,
  useColorScheme,
  View,
} from 'react-native';
import {
  Appbar,
  BottomNavigation,
  List,
  Button as PaperButton,
  Provider as PaperProvider,
  TextInput as PaperTextInput,
  Snackbar,
} from 'react-native-paper';
import Icon from '@react-native-vector-icons/material-design-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as rssParser from 'react-native-rss-parser';

import { useFeedStore } from './hooks/useFeedStore';
import { useSubStore } from './hooks/usePersistedStore';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const hydrateSubs = useSubStore(state => state.hydrate);
  const hydrateFeed = useFeedStore.getState().hydrate;

  useEffect(() => {
    hydrateSubs();
    hydrateFeed();
  }, [hydrateSubs, hydrateFeed]);

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'subscriptions', title: 'Subscriptions', icon: 'newspaper' },
    { key: 'feed', title: 'Feed', icon: 'rss' },
    { key: 'settings', title: 'Settings', icon: 'cog' },
  ]);

  const renderScene = BottomNavigation.SceneMap({
    subscriptions: SubscriptionsScreen,
    feed: FeedScreen,
    settings: SettingsScreen,
  });

  return (
    <PaperProvider>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <BottomNavigation
          navigationState={{ index, routes }}
          onIndexChange={setIndex}
          renderScene={renderScene}
          shifting={false}
          renderIcon={({ route, color }) => (
            <Icon name={route.icon} size={24} color={color} />
          )}
        />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

// SubStore and zustand logic moved to hooks/usePersistedStore.ts

function SubscriptionsScreen() {
  const [inputUrl, setInputUrl] = useState('');
  const subscriptions = useSubStore(state => state.subscriptions);
  const addUrl = useSubStore(state => state.addUrl);
  const removeUrl = useSubStore(state => state.removeUrl);
  const removeUrls = useSubStore(state => state.removeUrls);
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <>
      <Appbar.Header>
        <Appbar.Content title="Subscriptions" />
      </Appbar.Header>
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <PaperTextInput
            style={{ flex: 1, marginRight: 8 }}
            label="Add RSS feed URL"
            value={inputUrl}
            onChangeText={setInputUrl}
            autoCapitalize="none"
            mode="outlined"
          />
          <PaperButton
            mode="contained"
            onPress={() => {
              addUrl(inputUrl);
              setInputUrl('');
            }}
            disabled={!inputUrl}
            style={{ alignSelf: 'center' }}
          >
            Add
          </PaperButton>
        </View>
        <FlatList
          data={subscriptions}
          keyExtractor={item => item.url}
          extraData={selected}
          renderItem={({ item }) => {
            const isSelected = selected.includes(item.url);
            let statusColor = '#888';
            let statusText = '';
            if (item.validation === 'loading') {
              statusColor = '#007AFF';
              statusText = 'Validating...';
            } else if (item.validation === 'valid') {
              statusColor = 'green';
              statusText = 'Valid';
            } else if (item.validation === 'invalid') {
              statusColor = 'red';
              statusText = 'Invalid';
            }
            return (
              <List.Item
                title={item.url}
                description={statusText}
                left={props => (
                  <List.Icon
                    {...props}
                    icon={isSelected ? 'check-circle' : 'circle-outline'}
                    // color={isSelected ? '#007AFF' : '#888'}
                  />
                )}
                right={props => (
                  <PaperButton
                    mode="text"
                    onPress={() => removeUrl(item.url)}
                    color="#FF3B30"
                  >
                    Remove
                  </PaperButton>
                )}
                onPress={() => {
                  setSelected(prev =>
                    isSelected
                      ? prev.filter(u => u !== item.url)
                      : [...prev, item.url],
                  );
                }}
              />
            );
          }}
        />
        {selected.length > 0 && (
          <PaperButton
            mode="contained"
            onPress={() => {
              removeUrls(selected);
              setSelected([]);
            }}
            color="#FF3B30"
            style={{ marginTop: 8 }}
          >
            {`Remove Selected (${selected.length})`}
          </PaperButton>
        )}
        <List.Subheader style={{ marginTop: 16 }}>
          Tap the Feed tab to view items from your subscriptions. Select and
          remove multiple feeds as needed.
        </List.Subheader>
      </View>
    </>
  );
}

// FeedScreen: show feed from first subscription
function FeedScreen() {
  const subscriptions = useSubStore(state => state.subscriptions);
  const feedItems = useFeedStore(state => state.items);
  const setFeedItems = useFeedStore(state => state.setItems);
  const markRead = useFeedStore(state => state.markRead);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllFeeds() {
      setLoading(true);
      setError(null);
      try {
        const allItems: any[] = [];
        await Promise.all(
          subscriptions
            .filter(sub => sub.validation === 'valid')
            .map(async sub => {
              try {
                const response = await fetch(sub.url);
                const text = await response.text();
                const feed = await rssParser.parse(text);
                if (feed.items) {
                  const metaItems = feed.items.map(item => ({
                    id: item.id || item.guid || item.link || item.title,
                    feedUrl: sub.url,
                    read: false,
                  }));
                  await setFeedItems(sub.url, metaItems);
                  allItems.push(
                    ...feed.items.map(item => ({ ...item, feedUrl: sub.url })),
                  );
                }
              } catch (e) {
                // Optionally handle per-feed errors
              }
            }),
        );
        allItems.sort((x, y) => {
          const dateX = x.published || x.pubDate || x.isoDate || x.date;
          const dateY = y.published || y.pubDate || y.isoDate || y.date;
          return new Date(dateY).getTime() - new Date(dateX).getTime();
        });
        setItems(allItems);
      } catch (e) {
        setError('Failed to load RSS feeds');
      }
      setLoading(false);
    }
    fetchAllFeeds();
  }, [subscriptions]);

  return (
    <>
      <Appbar.Header>
        <Appbar.Content title="RSS Feed" />
      </Appbar.Header>
      <View style={{ flex: 1, padding: 16 }}>
        <List.Subheader>
          {subscriptions.length === 0
            ? 'No feeds added.'
            : `Showing results from ${
                subscriptions.filter(sub => sub.validation === 'valid').length
              } valid feeds.`}
        </List.Subheader>
        {loading && (
          <List.Item
            title="Loading..."
            left={props => <List.Icon {...props} icon="progress-clock" />}
          />
        )}
        <FlatList
          data={items}
          keyExtractor={item => item.id || item.guid || item.link || item.title}
          renderItem={({ item }: { item: any }) => {
            const meta = feedItems.find(
              m =>
                m.id === (item.id || item.guid || item.link || item.title) &&
                m.feedUrl === item.feedUrl,
            );
            const isUnread = meta ? !meta.read : true;
            return (
              <List.Item
                title={item.title}
                description={item.contentSnippet || item.link}
                left={props =>
                  isUnread ? (
                    <List.Icon {...props} icon="circle" color="#007AFF" />
                  ) : (
                    <List.Icon {...props} icon="circle-outline" color="#888" />
                  )
                }
                right={props =>
                  item.feedUrl ? (
                    <List.Icon {...props} icon="rss" color="#aaa" />
                  ) : null
                }
                onPress={() => {
                  const possibleLink = item.links.find(d => !d.rel);
                  if (meta && isUnread) markRead(meta.id);
                  if (possibleLink.url) Linking.openURL(possibleLink.url);
                }}
              />
            );
          }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
        <Snackbar
          visible={!!error}
          onDismiss={() => setError(null)}
          duration={3000}
          style={{ backgroundColor: '#FF3B30' }}
        >
          {error}
        </Snackbar>
      </View>
    </>
  );
}

function SettingsScreen() {
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const subscriptions = useSubStore(state => state.subscriptions);
  const addUrl = useSubStore(state => state.addUrl);

  // Import OPML handler
  const handleImportOPML = async () => {
    try {
      const result = await pickFile({
        type: [types.allFiles],
        allowMultiSelection: false,
      });

      const uri = result && result[0] ? result[0].uri : false;
      console.log({ result });

      if (uri) {
        const response = await fetch(uri);
        const text = await response.text();
        // Parse OPML using xml2js
        xml2js.parseString(text, async (err, data) => {
          if (err || !data || !data.opml || !data.opml.body) {
            setSnackbar('Failed to parse OPML.');
            return;
          }
          const outlines = data.opml.body[0].outline || [];
          let added = 0;
          // OPML can be nested, flatten all outlines
          const flattenOutlines = nodes => {
            let urls = [];
            for (const node of nodes) {
              if (node.$ && node.$.xmlUrl) {
                urls.push(node.$.xmlUrl);
              }
              if (node.outline) {
                urls = urls.concat(flattenOutlines(node.outline));
              }
            }
            return urls;
          };
          const urls = flattenOutlines(outlines);
          for (const url of urls) {
            await addUrl(url);
            added++;
          }
          setSnackbar(`Imported ${added} feeds from OPML.`);
        });
      }
    } catch (e) {
      console.error(e);
      setSnackbar('Failed to import OPML.');
    }
  };

  // Export OPML handler
  const handleExportOPML = async () => {
    try {
      // Build OPML string
      const outlines = subscriptions
        .map(sub => `<outline type="rss" xmlUrl="${sub.url}" />`)
        .join('\n');
      const opml = `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="1.0">\n  <head>\n    <title>Feedit Subscriptions</title>\n  </head>\n  <body>\n    ${outlines}\n  </body>\n</opml>`;
      const path = RNFS.DocumentDirectoryPath + '/subscriptions.opml';
      await RNFS.writeFile(path, opml, 'utf8');
      await Share.open({ url: 'file://' + path });
      setSnackbar('OPML exported and ready to share.');
    } catch (e) {
      console.error(e);
      setSnackbar('Failed to export OPML.');
    }
  };

  return (
    <>
      <Appbar.Header>
        <Appbar.Content title="Settings" />
      </Appbar.Header>
      <View style={{ flex: 1, padding: 16 }}>
        <List.Section>
          <List.Subheader>OPML Import/Export</List.Subheader>
          <PaperButton
            mode="contained"
            style={{ marginBottom: 12 }}
            onPress={handleImportOPML}
          >
            Import OPML
          </PaperButton>
          <PaperButton mode="outlined" onPress={handleExportOPML}>
            Export OPML
          </PaperButton>
        </List.Section>
        <List.Subheader style={{ marginTop: 16 }}>
          Import an OPML file to add feeds, or export your subscriptions as
          OPML.
        </List.Subheader>
        <Snackbar
          visible={!!snackbar}
          onDismiss={() => setSnackbar(null)}
          duration={3000}
        >
          {snackbar}
        </Snackbar>
      </View>
    </>
  );
}

export default App;
