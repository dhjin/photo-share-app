import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuthStore } from '../store';
import { authApi } from '../services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [freshUser, setFreshUser] = useState(user);

  useEffect(() => {
    authApi.me().then((res) => setFreshUser(res.data.user)).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  };

  const u = freshUser || user;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{u?.nickname?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.nickname}>{u?.nickname}</Text>
        <Text style={styles.email}>{u?.email}</Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>⭐ {u?.points || 0} 포인트</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>포인트 획득 방법</Text>
        <View style={styles.rewardItem}><Text style={styles.rewardIcon}>📸</Text><Text style={styles.rewardDesc}>사진 업로드</Text><Text style={styles.rewardPts}>+10pt</Text></View>
        <View style={styles.rewardItem}><Text style={styles.rewardIcon}>📡</Text><Text style={styles.rewardDesc}>다른 사람이 내 사진을 노드로 캐시</Text><Text style={styles.rewardPts}>+1pt</Text></View>
        <View style={styles.rewardItem}><Text style={styles.rewardIcon}>⬇️</Text><Text style={styles.rewardDesc}>내 사진 다운로드</Text><Text style={styles.rewardPts}>+1pt</Text></View>
        <View style={styles.rewardItem}><Text style={styles.rewardIcon}>❤️</Text><Text style={styles.rewardDesc}>내 사진 좋아요</Text><Text style={styles.rewardPts}>+2pt</Text></View>
        <View style={styles.rewardItem}><Text style={styles.rewardIcon}>✅</Text><Text style={styles.rewardDesc}>사진 요청 응답</Text><Text style={styles.rewardPts}>+20pt</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>P2P 네트워크 구조</Text>
        <Text style={styles.info}>사진은 서버에 저장되지 않습니다.</Text>
        <Text style={styles.info}>썸네일만 서버에 보관, 원본은 사용자 간 P2P 전송.</Text>
        <Text style={styles.info}>노드가 많을수록 다운로드 속도가 빨라집니다.</Text>
        <Text style={styles.info}>원작자만 사진을 삭제할 수 있습니다.</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingBottom: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3a7d44', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: '700' },
  nickname: { fontSize: 22, fontWeight: '700', color: '#2d4a2d', marginBottom: 4 },
  email: { fontSize: 14, color: '#888', marginBottom: 12 },
  pointsBadge: { backgroundColor: '#fff8e1', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20, borderWidth: 1, borderColor: '#ffd54f' },
  pointsText: { fontSize: 16, fontWeight: '700', color: '#f57f17' },
  section: { margin: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2d4a2d', marginBottom: 12 },
  rewardItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rewardIcon: { fontSize: 18, marginRight: 10 },
  rewardDesc: { flex: 1, fontSize: 13, color: '#555' },
  rewardPts: { fontSize: 13, fontWeight: '700', color: '#3a7d44' },
  info: { fontSize: 13, color: '#555', lineHeight: 22 },
  logoutBtn: { margin: 16, borderWidth: 1, borderColor: '#c0392b', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 40 },
  logoutBtnText: { color: '#c0392b', fontWeight: '600', fontSize: 15 },
});
