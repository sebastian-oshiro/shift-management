import apiClient from './api';
import { User, LoginRequest, RegisterRequest, ApiResponse } from '../types';

// 認証サービスクラス
class AuthService {
  // ログイン
  async login(credentials: LoginRequest): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { token, user } = response.data;
      
      // トークンとユーザー情報をローカルストレージに保存
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { data: user };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'ログインに失敗しました' };
    }
  }

  // ログアウト
  async logout(): Promise<ApiResponse<void>> {
    try {
      await apiClient.post('/auth/logout');
      
      // ローカルストレージからトークンとユーザー情報を削除
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return { message: 'ログアウトしました' };
    } catch (error: any) {
      // エラーが発生してもローカルストレージはクリアする
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { error: error.response?.data?.error || 'ログアウトに失敗しました' };
    }
  }

  // ユーザー登録
  async register(userData: RegisterRequest): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'ユーザー登録に失敗しました' };
    }
  }

  // プロフィール取得
  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.get('/auth/profile');
      return { data: response.data };
    } catch (error: any) {
      return { error: error.response?.data?.error || 'プロフィールの取得に失敗しました' };
    }
  }

  // 現在のユーザー情報を取得（ローカルストレージから）
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  // ログイン状態をチェック
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  // トークンを取得
  getToken(): string | null {
    return localStorage.getItem('token');
  }
}

// シングルトンインスタンスをエクスポート
export default new AuthService(); 