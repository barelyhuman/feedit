import { Animated, View } from 'react-native'
import Icon from '@react-native-vector-icons/material-design-icons'
import { Badge, List } from 'react-native-paper'
import styles from '../styles/styles'

const FeedRightIcons = ({
  feed,
  multiSelect,
  rotation,
  theme,
  ...props
}: any) => {
  const feedUnreadCount = feed.items.filter((i: any) => i.unread).length
  return (
    <View style={styles.rowCenter}>
      {feed.isLoading ? (
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Icon color={theme.colors.primary} name="loading" />
        </Animated.View>
      ) : feedUnreadCount > 0 ? (
        <Badge>{feed.items.filter((i: any) => i.unread).length}</Badge>
      ) : null}
      {!multiSelect && <List.Icon {...props} icon="arrow-right" />}
    </View>
  )
}

export default FeedRightIcons
