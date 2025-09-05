import { useNavigation } from '@react-navigation/native';
import { View } from 'react-native';
import { Appbar } from 'react-native-paper';

const BookmarkPage = ({}: { route: { params: { id: string } } } & Record<
  any,
  unknown
>) => {
  const navigation = useNavigation();
  return (
    <View>
      <Appbar.Header>
        <Appbar.Action
          icon="hamburger"
          onPress={() => {
            navigation.toggleDrawer();
          }}
        />
        <Appbar.Content title={'Bookmarks'} />
      </Appbar.Header>
    </View>
  );
};

export default BookmarkPage;
