import { View, StyleProp } from 'react-native'
import styles from '../styles/styles'

const FeedUnreadDot = ({
  unread,
  theme,
  style,
}: {
  style: StyleProp<any>
  unread: boolean
  theme: any
}) => (
  <View
    style={[
      style,
      styles.unreadDot,
      {
        backgroundColor: unread ? theme.colors.primary : theme.colors.surface,
      },
    ]}
  />
)

export default FeedUnreadDot
