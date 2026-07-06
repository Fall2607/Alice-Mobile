import { API_URL } from '../config/api';
import { authService } from './authService';

export const attendanceService = {
  // Verifikasi wajah
  async verifyFace(descriptor: number[], type: 'in' | 'out', forceEarlyOut: boolean = false, forceNewCheckIn: boolean = false) {
    try {
      const user = await authService.getUser();
      const karyawan_id = user ? (user.karyawan_id || user.id) : undefined;

      const response = await fetch(`${API_URL}/absensi/verify-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ descriptor, type, forceEarlyOut, forceNewCheckIn, karyawan_id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.isEarly) {
          // Lemparkan error spesifik untuk early checkout agar bisa ditangkap UI
          throw { isEarly: true, message: data.message };
        }
        if (data.isUnresolvedCheckout) {
          // Lemparkan error spesifik untuk unresolved checkout
          throw { isUnresolvedCheckout: true, message: data.message };
        }
        throw new Error(data.message || 'Gagal memverifikasi wajah');
      }
      return data;
    } catch (error: any) {
      if (error.isEarly || error.isUnresolvedCheckout) throw error;
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
  },

  // Mendapatkan daftar shift master
  async getShifts() {
    try {
      const response = await fetch(`${API_URL}/shift`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengambil data shift');
      }
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Terjadi kesalahan jaringan.');
    }
  },

  // Mendapatkan pemetaan jadwal karyawan bulan tertentu (format YYYY-MM)
  async getKaryawanSchedule(karyawanId: string, monthYear: string) {
    try {
      const response = await fetch(`${API_URL}/karyawan/${karyawanId}/jadwal-bulanan?month=${monthYear}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengambil jadwal karyawan');
      }
      return data; // Mengembalikan object { schedule: [...] }
    } catch (error: any) {
      throw new Error(error.message || 'Terjadi kesalahan jaringan.');
    }
  },

  // Mendapatkan detail karyawan (termasuk kelengkapan profil)
  async getKaryawanDetail(karyawanId: string) {
    try {
      const response = await fetch(`${API_URL}/karyawan/${karyawanId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengambil data karyawan');
      }
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Terjadi kesalahan jaringan.');
    }
  }
};
