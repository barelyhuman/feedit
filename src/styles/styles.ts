import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    height: 12,
    width: 12,
    borderRadius: 1000,
  },
  card: {
    margin: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 16,
  },
  cardActions: {
    marginTop: 10,
    marginHorizontal: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
})

export default styles
