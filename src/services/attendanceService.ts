import { API_URL } from '../config/api';
import { authService } from './authService';

export interface VerifyFaceOptions {
  descriptor: number[];
  type: 'in' | 'out';
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  forceEarlyOut?: boolean;
  forceNewCheckIn?: boolean;
}

export const attendanceService = {
  // Verifikasi wajah + lokasi GPS (Geofence RSU Avisena)
  async verifyFace(options: VerifyFaceOptions) {
    try {
      const user = await authService.getUser();
      const karyawan_id = user ? user.karyawan_id || user.id : undefined;

      const response = await fetch(`${API_URL}/absensi/verify-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          descriptor: options.descriptor,
          type: options.type,
          forceEarlyOut: options.forceEarlyOut ?? false,
          forceNewCheckIn: options.forceNewCheckIn ?? false,
          karyawan_id,
          latitude: options.latitude,
          longitude: options.longitude,
          accuracy: options.accuracy,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.isEarly) {
          throw { isEarly: true, message: data.message };
        }
        if (data.isUnresolvedCheckout) {
          throw { isUnresolvedCheckout: true, message: data.message };
        }
        if (data.isOutOfArea) {
          throw { isOutOfArea: true, distance: data.distance, message: data.message };
        }
        throw new Error(data.message || 'Gagal memverifikasi wajah');
      }
      return data;
    } catch (error: any) {
      if (error.isEarly || error.isUnresolvedCheckout || error.isOutOfArea) throw error;
      throw new Error(error.message || 'Terjadi kesalahan jaringan.');
    }
  },

  // Mendapatkan riwayat absensi (bisa difilter per bulan & tahun)
  async getAbsensiHistory(karyawanId: string, month?: number, year?: number) {
    try {
      let url = `${API_URL}/absensi/${karyawanId}`;
      if (month && year) {
        url += `?month=${month}&year=${year}`;
      }
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengambil riwayat absensi');
      }
      return data;
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
      const response = await fetch(
        `${API_URL}/karyawan/${karyawanId}/jadwal-bulanan?month=${monthYear}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

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
  },
};
