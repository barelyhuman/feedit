import { Linking } from 'react-native';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';

export const openUrl = async (url: string) => {
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) return;
  if (await InAppBrowser.isAvailable()) return await InAppBrowser.open(url);
  return Linking.openURL(url);
};
