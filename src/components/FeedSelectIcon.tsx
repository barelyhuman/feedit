import { List } from 'react-native-paper'

const FeedSelectIcon = (props: any) => (
  <List.Icon
    {...props}
    icon={props.selected ? 'check-circle' : 'circle-outline'}
  />
)

export default FeedSelectIcon
