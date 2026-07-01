import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/api';

const TOKEN_KEY = 'user_token';
const USER_KEY = 'user_data';

export const authService = {
  async login(identifier: string, password: string) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login gagal.');
      }
      
      if (data.token) {
        await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      }
      
      if (data.user) {
        // Karena SecureStore lebih ditujukan untuk text pendek (token/kredensial rahasia), 
        // kita bisa simpan string JSON user di SecureStore juga, atau AsyncStorage (karena tidak terlalu rahasia).
        // Sesuai best practice, kita simpan profil di SecureStore untuk keseragaman jika ukurannya wajar.
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
      }
      
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Terjadi kesalahan jaringan.');
    }
  },

  async logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },

  async getToken() {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async getUser() {
    const userData = await SecureStore.getItemAsync(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },
  
  async isLoggedIn() {
    const token = await this.getToken();
    return !!token;
  }
};
