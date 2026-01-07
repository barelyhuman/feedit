import { Animated, View } from 'react-native'
import Icon from '@react-native-vector-icons/material-design-icons'
import { Badge, List } from 'react-native-paper'
import styles from '../styles/styles'
import { useFeedStore } from '../lib/store/feed'

const FeedRightIcons = ({
  feed,
  multiSelect,
  rotation,
  theme,
  ...props
}: any) => {
  const feedUnreadCount = useFeedStore(state => state.getUnreadCount(feed.id))
  return (
    <View style={styles.rowCenter}>
      {feed.isLoading ? (
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Icon color={theme.colors.primary} name="loading" />
        </Animated.View>
      ) : feedUnreadCount > 0 ? (
        <Badge>{feedUnreadCount}</Badge>
      ) : null}
      {!multiSelect && <List.Icon {...props} icon="arrow-right" />}
    </View>
  )
}

export default FeedRightIcons
