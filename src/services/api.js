import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const photoApi = {
  upload: (formData) => api.post('/photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  nearby: (lat, lng, radius = 10) => api.get('/photos/nearby', { params: { lat, lng, radius } }),
  ranking: (lat, lng, radius) => api.get('/photos/ranking', { params: { lat, lng, radius } }),
  get: (id) => api.get(`/photos/${id}`),
  like: (id) => api.post(`/photos/${id}/like`),
  registerDownload: (id) => api.post(`/photos/${id}/download`),
  delete: (id) => api.delete(`/photos/${id}`),
  thumbnailUrl: (id) => `${API_BASE}/photos/${id}/thumbnail`,
};

export const nodeApi = {
  register: (photoId) => api.post('/nodes/register', { photo_id: photoId }),
  heartbeat: (photoIds) => api.post('/nodes/heartbeat', { photo_ids: photoIds }),
  leave: (photoId) => api.post('/nodes/leave', { photo_id: photoId }),
  getNodes: (photoId) => api.get(`/nodes/${photoId}`),
};

export const requestApi = {
  create: (data) => api.post('/requests', data),
  nearby: (lat, lng, radius = 10) => api.get('/requests/nearby', { params: { lat, lng, radius } }),
  fulfill: (id, photoId) => api.post(`/requests/${id}/fulfill`, { photo_id: photoId }),
  mine: () => api.get('/requests/mine'),
};

export const configApi = {
  ice: () => api.get('/config/ice'),
};

export default api;
