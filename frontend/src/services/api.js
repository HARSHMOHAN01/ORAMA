import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getPotholes = async () => {
  const response = await apiClient.get('/potholes');
  return response.data;
};

export const deletePothole = async (id) => {
  const response = await apiClient.delete(`/pothole/${id}`);
  return response.data;
};

export const getStats = async () => {
  const response = await apiClient.get('/potholes/stats');
  return response.data;
};

export const getPotholeRoutes = async () => {
  const response = await apiClient.get('/potholes/routes');
  return response.data;
};

export default apiClient;
