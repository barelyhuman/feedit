import { useState } from 'react';
import {
  Portal,
  Modal,
  Card,
  TextInput,
  Button,
  FAB,
  Text,
  useTheme,
} from 'react-native-paper';
import { useFeedStore } from '../lib/store/feed';
import styles from '../styles/styles';

const AddFeedFAB = () => {
  const [url, setUrl] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const addFeed = useFeedStore(state => state.addFeed);
  const showModal = () => {
    setError('');
    setVisible(true);
  };
  const hideModal = () => {
    setError('');
    setVisible(false);
  };

  const validateAndAddFeed = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(url.trim());
      const text = await response.text();
      if (text.includes('<rss') || text.includes('<feed')) {
        addFeed(url.trim());
        setUrl('');
        hideModal();
      } else {
        setError('URL does not contain valid RSS data.');
      }
    } catch (e) {
      setError('Failed to fetch or parse RSS feed.');
    }
    setLoading(false);
  };
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
              <Button onPress={hideModal} disabled={loading}>Cancel</Button>
              <Button onPress={validateAndAddFeed} loading={loading} disabled={loading}>
                Ok
              </Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>
      <FAB icon="plus" style={styles.fab} onPress={() => showModal()} />
    </>
  );
};

export default AddFeedFAB;
