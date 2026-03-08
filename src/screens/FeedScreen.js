import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { photoApi } from '../services/api';
import { usePhotoStore } from '../store';

function PhotoCard({ photo, onPress, onLike }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(photo)}>
      <Image source={{ uri: photoApi.thumbnailUrl(photo.id) }} style={styles.thumbnail} />
      <View style={styles.info}>
        <Text style={styles.owner}>📷 {photo.owner_nickname}</Text>
        <Text style={styles.location}>📍 {photo.address || `${photo.lat.toFixed(4)}, ${photo.lng.toFixed(4)}`}</Text>
        <Text style={styles.distance}>{photo.distance_km ? `${photo.distance_km.toFixed(1)} km` : ''}</Text>
        <View style={styles.stats}>
          <TouchableOpacity onPress={() => onLike(photo.id)} style={styles.statBtn}>
            <Text>{photo.liked ? '❤️' : '🤍'} {photo.like_count}</Text>
          </TouchableOpacity>
          <Text style={styles.stat}>📡 {photo.node_count} nodes</Text>
          <Text style={styles.stat}>⬇️ {photo.download_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FeedScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState(null);
  const [mode, setMode] = useState('nearby'); // 'nearby' | 'ranking'
  const { nearbyPhotos, rankingPhotos, setNearbyPhotos, setRankingPhotos } = usePhotoStore();

  const fetchLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('위치 권한 필요', '주변 사진을 보려면 위치 접근이 필요합니다.');
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocation(loc.coords);
    return loc.coords;
  };

  const fetchPhotos = useCallback(async (coords) => {
    const loc = coords || location;
    if (!loc) return;
    try {
      const [nearbyRes, rankingRes] = await Promise.all([
        photoApi.nearby(loc.latitude, loc.longitude, 20),
        photoApi.ranking(loc.latitude, loc.longitude, 50),
      ]);
      setNearbyPhotos(nearbyRes.data.photos);
      setRankingPhotos(rankingRes.data.photos);
    } catch (err) {
      Alert.alert('Error', 'Failed to load photos');
    }
  }, [location]);

  useEffect(() => {
    (async () => {
      const coords = await fetchLocation();
      await fetchPhotos(coords);
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPhotos();
    setRefreshing(false);
  };

  const handleLike = async (photoId) => {
    try {
      await photoApi.like(photoId);
      await fetchPhotos();
    } catch {}
  };

  const photos = mode === 'nearby' ? nearbyPhotos : rankingPhotos;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3a7d44" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌿 PhotoShare</Text>
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, mode === 'nearby' && styles.tabActive]} onPress={() => setMode('nearby')}>
            <Text style={[styles.tabText, mode === 'nearby' && styles.tabTextActive]}>주변</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === 'ranking' && styles.tabActive]} onPress={() => setMode('ranking')}>
            <Text style={[styles.tabText, mode === 'ranking' && styles.tabTextActive]}>랭킹</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PhotoCard
            photo={item}
            onPress={(p) => navigation.navigate('PhotoDetail', { photoId: p.id })}
            onLike={handleLike}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>주변에 사진이 없습니다.\n먼저 사진을 업로드해보세요! 📷</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#2d4a2d', marginBottom: 8 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f0f0f0' },
  tabActive: { backgroundColor: '#3a7d44' },
  tabText: { fontSize: 13, color: '#666' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  card: { margin: 12, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  thumbnail: { width: '100%', height: 220, backgroundColor: '#e8e8e8' },
  info: { padding: 12 },
  owner: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  location: { fontSize: 12, color: '#666', marginBottom: 2 },
  distance: { fontSize: 12, color: '#3a7d44', marginBottom: 8 },
  stats: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  statBtn: { padding: 4 },
  stat: { fontSize: 13, color: '#555' },
  empty: { textAlign: 'center', marginTop: 60, color: '#999', lineHeight: 24 },
});
