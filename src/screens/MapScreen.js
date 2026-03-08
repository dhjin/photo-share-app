import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { photoApi } from '../services/api';

export default function MapScreen({ navigation }) {
  const webviewRef = useRef(null);
  const [initData, setInitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [webviewReady, setWebviewReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('위치 권한이 필요합니다');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        const res = await photoApi.nearby(latitude, longitude, 30);
        setInitData({ lat: latitude, lng: longitude, photos: res.data?.photos ?? [] });
      } catch (e) {
        console.error('[MapScreen]', e);
        setError('지도를 불러오는 중 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 위치+사진 데이터와 WebView가 모두 준비되면 지도 초기화
  useEffect(() => {
    if (webviewReady && initData) {
      const js = `window.initMap(${initData.lat}, ${initData.lng}, ${JSON.stringify(initData.photos)});true;`;
      webviewRef.current?.injectJavaScript(js);
    }
  }, [webviewReady, initData]);

  const onMessage = async (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'tap') {
        navigation.navigate('PhotoDetail', { photoId: msg.id });
      } else if (msg.type === 'move') {
        const radiusKm = (msg.latDelta * 111) / 2;
        const res = await photoApi.nearby(msg.lat, msg.lng, Math.min(radiusKm, 50));
        const photos = res.data?.photos ?? [];
        webviewRef.current?.injectJavaScript(
          `window.updateMarkers(${JSON.stringify(JSON.stringify(photos))});true;`
        );
      }
    } catch (e) {
      console.error('[MapScreen] onMessage error', e);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3a7d44" /></View>;
  }
  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ uri: 'file:///android_asset/map.html' }}
        onLoad={() => setWebviewReady(true)}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        allowFileAccessFromFileURLs
        mixedContentMode="always"
        style={styles.map}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#c0392b', fontSize: 15, textAlign: 'center' },
  map: { flex: 1 },
});
