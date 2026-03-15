import { useState } from 'react'
import {
  Portal,
  Modal,
  Card,
  TextInput,
  Button,
  FAB,
  Text,
  useTheme,
} from 'react-native-paper'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { feeds as feedsTable, feedItems as feedItemsTable } from '../lib/db/schema'
import { parseRSS, sortByPublished, useFeedStore } from '../lib/store/feed'
import styles from '../styles/styles'

const AddFeedFAB = () => {
  const [url, setUrl] = useState('')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const theme = useTheme()
  const hydrateFeed = useFeedStore(d => d.hydrate)
  const showModal = () => {
    setError('')
    setVisible(true)
  }
  const hideModal = () => {
    setError('')
    setVisible(false)
  }

  const validateAndAddFeed = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    try {
      const text = await fetch(url.trim()).then(r => r.text())
      if (!text.includes('<rss') && !text.includes('<feed')) {
        setError('URL does not contain valid RSS data.')
        return
      }

      const existing = await db.select().from(feedsTable)
        .where(eq(feedsTable.feedUrl, url.trim())).get()
      if (existing) {
        setUrl('')
        hideModal()
        return
      }

      const feed = parseRSS(text, url.trim())
      feed.items = feed.items.sort(sortByPublished)

      await db.insert(feedsTable).values([{
        id: feed.id,
        title: feed.title ?? '',
        feedUrl: url.trim(),
        link: feed.link ?? '',
      }]).run()

      if (feed.items.length > 0) {
        await db.insert(feedItemsTable).values(
          feed.items.map(i => ({
            id: i.id,
            feedId: feed.id,
            title: i.title,
            link: i.link,
            published: i.published ?? undefined,
            unread: i.unread ?? true,
          }))
        ).run()
      }

      await hydrateFeed()
      setUrl('')
      hideModal()
    } catch (e) {
      setError('Failed to fetch or parse RSS feed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Portal>
        <Modal visible={visible} onDismiss={hideModal}>
          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Title titleStyle={styles.cardTitle} title={'Add Feed'} />
            <Card.Content>
              <TextInput
                mode="outlined"
                label="Feed URL"
                placeholder="https://reaper.is/rss.xml"
                value={url}
                onChangeText={setUrl}
                error={!!error}
              />
              {error ? (
                <Text style={{ color: theme.colors.error, marginTop: 8 }}>
                  {error}
                </Text>
              ) : null}
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              <Button onPress={hideModal} disabled={loading}>
                Cancel
              </Button>
              <Button
                onPress={validateAndAddFeed}
                loading={loading}
                disabled={loading}
              >
                Ok
              </Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>
      <FAB icon="plus" style={styles.fab} onPress={() => showModal()} />
    </>
  )
}

export default AddFeedFAB
