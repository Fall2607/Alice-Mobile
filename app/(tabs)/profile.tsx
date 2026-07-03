import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { User, LogOut, Settings, ShieldCheck, FileText, X } from 'lucide-react-native';
import { authService } from '../../src/services/authService';
import { attendanceService } from '../../src/services/attendanceService';

export default function Profile() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('');
  const [userId, setUserId] = useState('');

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [karyawanDetail, setKaryawanDetail] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const user = await authService.getUser();
    if (user) {
      setUserName(user.name || user.nama || 'Karyawan');
      setRole(user.role || 'Staf');
      setUserId(user.karyawan_id || user.id);
    }
  };

  const handleShowDetail = async () => {
    setDetailVisible(true);
    if (!karyawanDetail) {
      setDetailLoading(true);
      try {
        const detail = await attendanceService.getKaryawanDetail(userId);
        setKaryawanDetail(detail);
      } catch (e) {
        console.log("Error fetch detail:", e);
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <User size={48} color="#FFFFFF" />
        </View>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.role}>{role}</Text>
      </View>

      {/* Menu Options */}
      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem} onPress={handleShowDetail} activeOpacity={0.7}>
          <View style={[styles.menuIconWrap, { backgroundColor: '#F0FDF4' }]}>
            <FileText size={20} color="#10B981" />
          </View>
          <Text style={styles.menuText}>Detail Data Diri</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={styles.menuIconWrap}>
            <Settings size={20} color="#0EA5E9" />
          </View>
          <Text style={styles.menuText}>Pengaturan Akun</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={styles.menuIconWrap}>
            <ShieldCheck size={20} color="#10B981" />
          </View>
          <Text style={styles.menuText}>Keamanan & Privasi</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout} activeOpacity={0.7}>
          <View style={[styles.menuIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <LogOut size={20} color="#EF4444" />
          </View>
          <Text style={[styles.menuText, { color: '#EF4444' }]}>Keluar Aplikasi</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Detail Karyawan */}
      <Modal visible={detailVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Informasi Data Diri</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.closeBtn}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {detailLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0EA5E9" />
              </View>
            ) : karyawanDetail ? (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailCard}>
                  <DetailRow label="Nama Lengkap" value={karyawanDetail.nama_lengkap} />
                  <DetailRow label="NIP" value={karyawanDetail.nip} />
                  <DetailRow label="NIK" value={karyawanDetail.nik} />
                  <DetailRow label="Departemen" value={karyawanDetail.nama_departemen || '-'} />
                  <DetailRow label="Level Jabatan" value={karyawanDetail.nama_level || '-'} />
                  <DetailRow label="Status" value={karyawanDetail.status_kepegawaian || '-'} />
                  <DetailRow label="Email" value={karyawanDetail.email || '-'} />
                  <DetailRow label="No. Handphone" value={karyawanDetail.handphone || '-'} />
                  <DetailRow label="Atasan" value={karyawanDetail.nama_atasan || '-'} />
                  <DetailRow label="Tanggal Masuk" value={karyawanDetail.tanggal_masuk ? new Date(karyawanDetail.tanggal_masuk).toLocaleDateString('id-ID') : '-'} />
                </View>
              </ScrollView>
            ) : (
              <View style={styles.loaderContainer}>
                <Text style={{color: '#64748B'}}>Gagal memuat data.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0EA5E9',
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  menuContainer: {
    padding: 24,
    marginTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutItem: {
    marginTop: 24,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  modalBody: {
    padding: 24,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 40,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  }
});
