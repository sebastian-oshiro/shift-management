import axios, { AxiosInstance, AxiosResponse } from 'axios';

// APIの基本設定
const API_BASE_URL = 'http://localhost:8080/api';

// axiosインスタンスの作成
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター（リクエスト送信前に実行）
apiClient.interceptors.request.use(
  (config) => {
    // トークンがある場合は自動的にヘッダーに追加
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（レスポンス受信後に実行）
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    // 401エラー（認証エラー）の場合はログインページにリダイレクト
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient; 