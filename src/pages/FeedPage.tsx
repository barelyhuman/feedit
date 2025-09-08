import { View } from 'react-native'
import { Appbar, Text } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { useFeedStore } from '../lib/store/feed'
import FeedItemList from '../components/FeedItemList'

const FeedPage = ({
  route,
}: { route: { params: { id: string } } } & Record<any, unknown>) => {
  const params = route.params
  const navigation = useNavigation()
  const feed = useFeedStore(state => state.feeds.find(f => f.id === params.id))
  const markAllUnread = useFeedStore(state => state.markAllUnread)
  if (!feed) return <Text>Not found</Text>
  return (
    <>
      <Appbar.Header>
        <Appbar.BackAction
          onPress={() => {
            navigation.navigate({ name: 'Home' })
          }}
        />
        <Appbar.Content title={feed?.title} />
        <Appbar.Action
          icon="check-all"
          onPress={() => {
            markAllUnread(params.id, false)
          }}
        />
      </Appbar.Header>
      <FeedItemList feedId={params.id} />
    </>
  )
}

export default FeedPage
