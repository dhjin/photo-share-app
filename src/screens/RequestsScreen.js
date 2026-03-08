import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { requestApi } from '../services/api';

function RequestCard({ request, onFulfill }) {
  return (
    <View style={styles.card}>
      <Text style={styles.description}>{request.description}</Text>
      <Text style={styles.meta}>👤 {request.requester_nickname}</Text>
      <Text style={styles.meta}>📍 {request.lat.toFixed(4)}, {request.lng.toFixed(4)}</Text>
      <Text style={styles.meta}>🕐 {new Date(request.created_at).toLocaleDateString('ko-KR')}</Text>
      {request.status === 'open' && (
        <TouchableOpacity style={styles.fulfillBtn} onPress={() => onFulfill(request)}>
          <Text style={styles.fulfillBtnText}>📷 사진 촬영으로 응답</Text>
        </TouchableOpacity>
      )}
      {request.status === 'fulfilled' && (
        <Text style={styles.fulfilled}>✅ 완료됨</Text>
      )}
    </View>
  );
}

export default function RequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return setLoading(false);

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      const res = await requestApi.nearby(loc.coords.latitude, loc.coords.longitude, 20);
      setRequests(res.data.requests);
    } catch {}
    setLoading(false);
  };

  const createRequest = async () => {
    if (!description.trim()) return Alert.alert('Error', '요청 내용을 입력해주세요.');
    if (!location) return Alert.alert('Error', '위치 정보가 필요합니다.');

    setSubmitting(true);
    try {
      await requestApi.create({
        lat: location.latitude,
        lng: location.longitude,
        description: description.trim(),
      });
      Alert.alert('요청 완료!', '주변 사용자에게 사진 요청이 전송되었습니다 📷');
      setDescription('');
      setShowModal(false);
      fetchRequests();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFulfill = (request) => {
    Alert.alert(
      '사진 촬영으로 응답',
      `"${request.description}" 요청에 사진으로 응답하시겠어요?\n업로드 후 요청을 완료 처리할 수 있습니다.`,
      [
        { text: '취소' },
        { text: '업로드하기', onPress: () => navigation.navigate('Upload') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📝 사진 요청</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.createBtnText}>+ 요청하기</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#3a7d44" /></View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <RequestCard request={item} onFulfill={handleFulfill} />}
          ListEmptyComponent={<Text style={styles.empty}>주변 사진 요청이 없습니다\n첫 번째 요청을 만들어보세요! 📷</Text>}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshing={loading}
          onRefresh={fetchRequests}
        />
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>📷 사진 요청 만들기</Text>
          <Text style={styles.modalSub}>주변 사용자에게 특정 사진을 요청할 수 있습니다</Text>

          <TextInput
            style={styles.textArea}
            placeholder="예: 오늘 한강 노을 사진 찍어주세요!"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          {location && (
            <Text style={styles.locationText}>📍 현재 위치 기준으로 요청됩니다</Text>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={createRequest} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>요청 보내기</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 22, fontWeight: '700', color: '#2d4a2d' },
  createBtn: { backgroundColor: '#3a7d44', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  description: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 8 },
  meta: { fontSize: 12, color: '#888', marginBottom: 2 },
  fulfillBtn: { marginTop: 10, backgroundColor: '#3a7d44', borderRadius: 8, padding: 10, alignItems: 'center' },
  fulfillBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  fulfilled: { marginTop: 8, color: '#3a7d44', fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 60, color: '#999', lineHeight: 24 },
  modal: { flex: 1, padding: 24, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#2d4a2d', marginTop: 20, marginBottom: 8 },
  modalSub: { fontSize: 13, color: '#888', marginBottom: 20 },
  textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 14, minHeight: 120, textAlignVertical: 'top', marginBottom: 12 },
  locationText: { fontSize: 12, color: '#3a7d44', marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#666', fontWeight: '600' },
  submitBtn: { flex: 1, backgroundColor: '#3a7d44', borderRadius: 12, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '600' },
});
