import { API_URL } from '../config/api';
import { authService } from './authService';

export const attendanceService = {
  // Verifikasi wajah
  async verifyFace(descriptor: number[], type: 'in' | 'out', forceEarlyOut: boolean = false) {
    try {
      const user = await authService.getUser();
      const karyawan_id = user ? (user.karyawan_id || user.id) : undefined;

      const response = await fetch(`${API_URL}/absensi/verify-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ descriptor, type, forceEarlyOut, karyawan_id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.isEarly) {
          // Lemparkan error spesifik untuk early checkout agar bisa ditangkap UI
          throw { isEarly: true, message: data.message };
        }
        throw new Error(data.message || 'Gagal memverifikasi wajah');
      }
      return data;
    } catch (error: any) {
      if (error.isEarly) throw error;
      throw new Error(error.message || 'Terjadi kesalahan jaringan.');
    }
  },

  // Mendapatkan riwayat absensi 30 terakhir (termasuk hari ini jika ada)
  async getAbsensiHistory(karyawanId: string) {
    try {
      const response = await fetch(`${API_URL}/absensi/${karyawanId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengambil riwayat absensi');
      }
      return data; // Array of absensi
    } catch (error: any) {
      throw new Error(error.message || 'Terjadi kesalahan jaringan.');
    }
  }
};
