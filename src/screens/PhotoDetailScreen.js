import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { photoApi, nodeApi } from '../services/api';
import { useAuthStore } from '../store';
import p2pService from '../services/p2p';

export default function PhotoDetailScreen({ route }) {
  const { photoId } = route.params;
  const [photo, setPhoto] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [isNode, setIsNode] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchPhoto();
  }, [photoId]);

  const fetchPhoto = async () => {
    try {
      const res = await photoApi.get(photoId);
      setPhoto(res.data.photo);
      setNodes(res.data.nodes);
      setIsNode(res.data.nodes.some((n) => n.user_id === user?.id));
    } catch {
      Alert.alert('Error', 'Failed to load photo');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      await photoApi.like(photoId);
      fetchPhoto();
    } catch {}
  };

  const handleP2PDownload = async () => {
    if (nodes.length === 0) return Alert.alert('노드 없음', '현재 이 사진을 공유 중인 사용자가 없습니다.');
    setDownloading(true);
    try {
      await p2pService.connect(user.id);
      await p2pService.requestPhoto(photoId, nodes.filter((n) => n.user_id !== user.id));
      Alert.alert('완료!', 'P2P 다운로드 완료. 이제 당신도 캐시 노드입니다! 📡');
      fetchPhoto();
    } catch (err) {
      Alert.alert('P2P 실패', err.message + '\n서버에서 썸네일을 통해 확인하세요.');
    } finally {
      setDownloading(false);
    }
  };

  const handleJoinNode = async () => {
    try {
      await nodeApi.register(photoId);
      setIsNode(true);
      Alert.alert('노드 참여!', '이 사진의 캐시 노드가 되었습니다. 포인트가 적립됩니다 📡');
      fetchPhoto();
    } catch {}
  };

  const handleLeaveNode = async () => {
    try {
      await nodeApi.leave(photoId);
      setIsNode(false);
      fetchPhoto();
    } catch {}
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3a7d44" /></View>;
  if (!photo) return <View style={styles.center}><Text>Photo not found</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: photoApi.thumbnailUrl(photo.id) }} style={styles.image} />

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.owner}>📷 {photo.owner_nickname}</Text>
          <Text style={styles.date}>{new Date(photo.created_at).toLocaleDateString('ko-KR')}</Text>
        </View>

        <Text style={styles.location}>📍 {photo.address || `${photo.lat.toFixed(5)}, ${photo.lng.toFixed(5)}`}</Text>

        <View style={styles.statsRow}>
          <TouchableOpacity onPress={handleLike} style={styles.statItem}>
            <Text style={styles.statValue}>{photo.liked ? '❤️' : '🤍'} {photo.like_count}</Text>
          </TouchableOpacity>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>📡 {photo.node_count}</Text>
            <Text style={styles.statLabel}>캐시 노드</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>⬇️ {photo.download_count}</Text>
            <Text style={styles.statLabel}>다운로드</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>⭐ {photo.rank_score?.toFixed(1)}</Text>
            <Text style={styles.statLabel}>랭크</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📡 캐시 노드 ({nodes.length}명)</Text>
          {nodes.map((n) => (
            <Text key={n.user_id} style={styles.nodeItem}>
              {n.user_id === photo.owner_id ? '👑' : '👤'} {n.nickname}
            </Text>
          ))}
          {nodes.length === 0 && <Text style={styles.noNodes}>아직 캐시 노드가 없습니다</Text>}
        </View>

        {photo.owner_id !== user?.id && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleP2PDownload} disabled={downloading}>
              {downloading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionBtnText}>📥 P2P 다운로드</Text>}
            </TouchableOpacity>

            {!isNode ? (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={handleJoinNode}>
                <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>📡 캐시 노드 참여</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleLeaveNode}>
                <Text style={styles.actionBtnText}>노드 탈퇴</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 300, backgroundColor: '#e8e8e8' },
  content: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  owner: { fontSize: 16, fontWeight: '700', color: '#2d4a2d' },
  date: { fontSize: 12, color: '#888' },
  location: { fontSize: 13, color: '#666', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 16 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  nodeItem: { fontSize: 13, color: '#555', marginBottom: 4 },
  noNodes: { fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 8 },
  actions: { gap: 10, marginBottom: 40 },
  actionBtn: { backgroundColor: '#3a7d44', borderRadius: 12, padding: 16, alignItems: 'center' },
  actionBtnSecondary: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#3a7d44' },
  actionBtnDanger: { backgroundColor: '#c0392b' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  actionBtnTextSecondary: { color: '#3a7d44' },
});
