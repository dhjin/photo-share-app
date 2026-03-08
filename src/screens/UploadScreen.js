import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  TextInput, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { photoApi } from '../services/api';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function UploadScreen({ navigation }) {
  const [image, setImage] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled) await processImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');

    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled) await processImage(result.assets[0].uri);
  };

  const processImage = async (uri) => {
    // Resize to max 2000px and compress
    const compressed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 2000 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Get current location
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        // Reverse geocode for address
        const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo.length > 0) {
          const g = geo[0];
          setAddress([g.city, g.district, g.street].filter(Boolean).join(' '));
        }
      }
    } catch {}

    setImage(compressed);
  };

  const upload = async () => {
    if (!image) return Alert.alert('Error', '사진을 선택해주세요.');
    if (!location) return Alert.alert('Error', '위치 정보를 가져올 수 없습니다.');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: image.uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });
      formData.append('lat', String(location.latitude));
      formData.append('lng', String(location.longitude));
      if (address) formData.append('address', address);

      await photoApi.upload(formData);
      Alert.alert('성공!', '사진이 업로드되었습니다. P2P 네트워크에 공유됩니다! 🌿', [
        { text: '확인', onPress: () => { setImage(null); setAddress(''); setLocation(null); } },
      ]);
    } catch (err) {
      if (err.response?.status === 409) {
        Alert.alert('중복 사진', '이미 동일한 사진이 플랫폼에 존재합니다.\n원작자의 사진을 확인해보세요.');
      } else {
        Alert.alert('업로드 실패', err.response?.data?.error || '다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📷 사진 업로드</Text>
        <Text style={styles.subtitle}>힐링 풍경 사진만 업로드 가능합니다\n(얼굴·사람 중심 사진 제한)</Text>
      </View>

      <View style={styles.imageArea}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🌿</Text>
            <Text style={styles.placeholderText}>사진을 선택하거나 촬영해주세요</Text>
          </View>
        )}
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.btn} onPress={takePhoto}>
          <Text style={styles.btnText}>📷 촬영</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={pickImage}>
          <Text style={[styles.btnText, styles.btnTextSecondary]}>🖼️ 갤러리</Text>
        </TouchableOpacity>
      </View>

      {location && (
        <View style={styles.locationCard}>
          <Text style={styles.locationLabel}>📍 촬영 위치</Text>
          <Text style={styles.locationText}>{address || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="위치 설명 (선택사항)"
        value={address}
        onChangeText={setAddress}
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>업로드하면 P2P 네트워크에 공유됩니다</Text>
        <Text style={styles.infoText}>최대 5MB • 자동 압축 적용</Text>
        <Text style={styles.infoText}>다른 사용자가 다운로드하면 포인트 획득!</Text>
      </View>

      <TouchableOpacity style={[styles.uploadBtn, !image && styles.uploadBtnDisabled]} onPress={upload} disabled={loading || !image}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadBtnText}>업로드 & P2P 공유</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 22, fontWeight: '700', color: '#2d4a2d' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 4, lineHeight: 18 },
  imageArea: { margin: 16, borderRadius: 16, overflow: 'hidden', height: 280, backgroundColor: '#e8ede8' },
  preview: { width: '100%', height: '100%' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 48, marginBottom: 12 },
  placeholderText: { color: '#888', fontSize: 14 },
  buttons: { flexDirection: 'row', marginHorizontal: 16, gap: 12, marginBottom: 16 },
  btn: { flex: 1, backgroundColor: '#3a7d44', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#3a7d44' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnTextSecondary: { color: '#3a7d44' },
  locationCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12 },
  locationLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  locationText: { fontSize: 14, color: '#333', fontWeight: '500' },
  input: { marginHorizontal: 16, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, backgroundColor: '#fff', fontSize: 14, marginBottom: 16 },
  infoBox: { marginHorizontal: 16, backgroundColor: '#e8f4e8', borderRadius: 10, padding: 12, marginBottom: 16 },
  infoText: { fontSize: 12, color: '#3a7d44', marginBottom: 2 },
  uploadBtn: { marginHorizontal: 16, backgroundColor: '#3a7d44', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 40 },
  uploadBtnDisabled: { backgroundColor: '#aaa' },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
