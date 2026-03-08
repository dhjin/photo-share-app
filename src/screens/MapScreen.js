import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { photoApi } from '../services/api';

export default function MapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [region, setRegion] = useState(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('위치 권한이 필요합니다');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        const coords = loc.coords;
        setLocation(coords);
        setRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        const res = await photoApi.nearby(coords.latitude, coords.longitude, 30);
        setPhotos(res.data?.photos ?? []);
      } catch (e) {
        console.error('[MapScreen]', e);
        setError('지도를 불러오는 중 오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onRegionChangeComplete = (newRegion) => {
    setRegion(newRegion);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const radiusKm = (newRegion.latitudeDelta * 111) / 2;
        const res = await photoApi.nearby(
          newRegion.latitude,
          newRegion.longitude,
          Math.min(radiusKm, 50),
        );
        setPhotos(res.data?.photos ?? []);
      } catch (e) {
        console.error('[MapScreen] region fetch error', e);
      }
    }, 600);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3a7d44" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton
      >
        {photos.map((photo) => (
          <Marker
            key={photo.id}
            coordinate={{ latitude: photo.lat, longitude: photo.lng }}
            title={photo.owner_nickname}
          >
            <View style={styles.markerContainer}>
              <Image
                source={{ uri: photoApi.thumbnailUrl(photo.id) }}
                style={styles.markerImage}
                defaultSource={require('../../assets/icon.png')}
              />
              <View style={styles.markerBadge}>
                <Text style={styles.markerBadgeText}>📡{photo.node_count}</Text>
              </View>
            </View>
            <Callout onPress={() => navigation.navigate('PhotoDetail', { photoId: photo.id })}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>📷 {photo.owner_nickname}</Text>
                <Text style={styles.calloutSub}>❤️ {photo.like_count}  📡 {photo.node_count} nodes</Text>
                <Text style={styles.calloutLink}>탭하여 보기</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      <View style={styles.legend}>
        <Text style={styles.legendText}>📡 = 캐시 노드 수</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#c0392b', fontSize: 15, textAlign: 'center' },
  map: { flex: 1 },
  markerContainer: { alignItems: 'center' },
  markerImage: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#3a7d44' },
  markerBadge: { backgroundColor: '#3a7d44', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 },
  markerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  callout: { width: 160, padding: 8 },
  calloutTitle: { fontWeight: '700', marginBottom: 4 },
  calloutSub: { fontSize: 12, color: '#555', marginBottom: 4 },
  calloutLink: { fontSize: 12, color: '#3a7d44', fontWeight: '600' },
  legend: { position: 'absolute', bottom: 20, left: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: 8 },
  legendText: { fontSize: 12, color: '#333' },
});
