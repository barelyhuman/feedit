import React, { Component } from 'react';
import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';

export default class WebViewThatOpensLinksInNavigator extends Component<{
  uri: string;
}> {
  webview: any;

  constructor(props: { uri: string }) {
    super(props);
  }

  render() {
    const uri = this.props.uri;
    console.log('rendered');
    return (
      <WebView
        ref={ref => {
          this.webview = ref;
        }}
        source={{ uri }}
        onNavigationStateChange={event => {
          if (event.url !== uri) {
            this.webview.stopLoading();
            Linking.openURL(event.url);
          }
        }}
      />
    );
  }
}
