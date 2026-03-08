import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { photoApi } from '../services/api';

const THUMB_BASE = 'http://116.32.135.243/photo_share/photos';

function buildHTML(lat, lng, photos) {
  const photosJson = JSON.stringify(photos);
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body,#map{width:100%;height:100vh;background:#e8f5e9}
  .pm img{width:44px;height:44px;border-radius:50%;border:2.5px solid #3a7d44;object-fit:cover;background:#c8e6c9;display:block}
  .pp{text-align:center;min-width:150px}
  .pp img{width:120px;height:120px;border-radius:8px;object-fit:cover;background:#c8e6c9}
  .pp .ti{font-weight:700;margin:5px 0 2px;font-size:13px}
  .pp .su{font-size:11px;color:#666;margin-bottom:6px}
  .pp .bt{background:#3a7d44;color:#fff;border:none;border-radius:6px;padding:5px 16px;font-size:12px;cursor:pointer}
</style>
</head><body><div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true}).setView([${lat},${lng}],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'© OpenStreetMap contributors',maxZoom:19
}).addTo(map);

L.circleMarker([${lat},${lng}],{
  radius:10,fillColor:'#4285F4',color:'#fff',weight:3,fillOpacity:0.95
}).addTo(map).bindPopup('내 위치');

var layer=L.layerGroup().addTo(map);

function tap(id){
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'tap',id:id}));
}

function setMarkers(photos){
  layer.clearLayers();
  photos.forEach(function(p){
    var icon=L.divIcon({
      className:'pm',
      html:'<img src="${THUMB_BASE}/'+p.id+'/thumbnail" onerror="this.src=\'\'"/>',
      iconSize:[44,44],iconAnchor:[22,22],popupAnchor:[0,-26]
    });
    L.marker([p.lat,p.lng],{icon:icon}).addTo(layer).bindPopup(
      '<div class="pp">'+
      '<img src="${THUMB_BASE}/'+p.id+'/thumbnail"/>'+
      '<div class="ti">📷 '+p.owner_nickname+'</div>'+
      '<div class="su">❤️ '+p.like_count+'  📡 '+p.node_count+' nodes</div>'+
      '<button class="bt" onclick="tap(\''+p.id+'\')">탭하여 보기</button>'+
      '</div>'
    );
  });
}

setMarkers(${photosJson});

var mt=null;
map.on('moveend',function(){
  clearTimeout(mt);
  mt=setTimeout(function(){
    var c=map.getCenter(),b=map.getBounds();
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type:'move',lat:c.lat,lng:c.lng,
      latDelta:b.getNorth()-b.getSouth()
    }));
  },700);
});

window.updateMarkers=function(json){setMarkers(JSON.parse(json));};
</script>
</body></html>`;
}

export default function MapScreen({ navigation }) {
  const webviewRef = useRef(null);
  const [initData, setInitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        source={{ html: buildHTML(initData.lat, initData.lng, initData.photos), baseUrl: 'http://localhost' }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
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
