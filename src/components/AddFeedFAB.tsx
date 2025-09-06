import { useState } from 'react';
import {
  Portal,
  Modal,
  Card,
  TextInput,
  Button,
  FAB,
  useTheme,
} from 'react-native-paper';
import { useFeedStore } from '../lib/store/feed';
import styles from '../styles/styles';

const AddFeedFAB = () => {
  const [url, setUrl] = useState('');
  const [visible, setVisible] = useState(false);
  const theme = useTheme();
  const addFeed = useFeedStore(state => state.addFeed);
  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);
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
              />
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              <Button onPress={() => hideModal()}>Cancel</Button>
              <Button
                onPress={() => {
                  if (url.trim()) {
                    addFeed(url);
                  }
                  setUrl('');
                  hideModal();
                }}
              >
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
