import { useRoute } from '@react-navigation/native';
import React from 'react';
import { WebView } from 'react-native-webview';

export default function WebviewPage() {
  const { params } = useRoute();
  return (
    <WebView
      style={{ flex: 1 }}
      useWebView2
      mixedContentMode={'compatibility'}
      javascriptEnabled={true}
      source={{
        uri: params.uri,
      }}
    />
  );
}

// export default class WebViewThatOpensLinksInNavigator extends Component<{
//   uri: string;
// }> {
//   webview: any;

//   constructor(props: { uri: string }) {
//     super(props);
//   }

//   render() {
//     const uri = this.props.uri;
//     console.log({ uri });
//     return (
//       <WebView
//         ref={ref => {
//           this.webview = ref;
//         }}
//         source={{ uri }}
//         // onNavigationStateChange={event => {
//         //   if (event.url !== uri) {
//         //     this.webview.stopLoading();
//         //     Linking.openURL(event.url);
//         //   }
//         // }}
//       />
//     );
//   }
// }
