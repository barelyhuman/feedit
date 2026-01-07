import AsyncStorage from '@react-native-async-storage/async-storage'
import { StateStorage } from 'zustand/middleware'

const getStore = async key => {
  try {
    let store = ''
    let numberOfParts = await AsyncStorage.getItem(key)
    if (typeof numberOfParts === 'undefined' || numberOfParts === null) {
      return null
    } else {
      numberOfParts = parseInt(numberOfParts, 10)
    }
    for (let i = 0; i < numberOfParts; i++) {
      store += await AsyncStorage.getItem(key + i)
    }
    if (store === '') {
      return null
    }
    return JSON.parse(store)
  } catch (error) {
    console.log('Could not get [' + key + '] from store.')
    console.log(error)
    return null
  }
}

const saveStore = async (key, data) => {
  try {
    const store = JSON.stringify(data).match(/.{1,1000000}/g)
    store.forEach((part, index) => {
      AsyncStorage.setItem(key + index, part)
    })
    AsyncStorage.setItem(key, '' + store.length)
  } catch (error) {
    console.log('Could not save store : ')
    console.log(error.message)
  }
}

const clearStore = async key => {
  try {
    console.log('Clearing store for [' + key + ']')
    let numberOfParts = await AsyncStorage.getItem(key)
    if (typeof numberOfParts !== 'undefined' && numberOfParts !== null) {
      numberOfParts = parseInt(numberOfParts, 10)
      for (let i = 0; i < numberOfParts; i++) {
        AsyncStorage.removeItem(key + i)
      }
      AsyncStorage.removeItem(key)
    }
  } catch (error) {
    console.log('Could not clear store : ')
    console.log(error.message)
  }
}

export const chunkAsyncStore: StateStorage = {
  async getItem(name) {
    return getStore(name)
  },
  async setItem(name, value) {
    return saveStore(name, value)
  },
  async removeItem(name) {
    return clearStore(name)
  },
}
