import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  LogOut,
  ShieldCheck,
  FileText,
  X,
  ChevronRight,
  MapPin,
} from 'lucide-react-native';
import { authService } from '../../src/services/authService';
import { attendanceService } from '../../src/services/attendanceService';
import { ABSENSI_GEOFENCE, formatDistance } from '../../src/utils/geofence';
import { COLORS } from '../../src/config/theme';

export default function Profile() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
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
      setRole(user.role || 'Staf RSU Avisena');
      setEmail(user.email || '-');
      setUserId(user.karyawan_id || user.id);
    }
  };

  const handleShowDetail = async () => {
    setDetailVisible(true);
    if (!karyawanDetail && userId) {
      setDetailLoading(true);
      try {
        const detail = await attendanceService.getKaryawanDetail(userId);
        setKaryawanDetail(detail);
      } catch (e) {
        console.log('Error fetch detail:', e);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Profile Header Navy */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <User size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.userEmail}>{email}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{role}</Text>
        </View>
      </View>

      {/* Menu Options */}
      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={handleShowDetail}
          activeOpacity={0.75}
        >
          <View style={styles.menuLeft}>
            <View
              style={[
                styles.menuIconWrap,
                { backgroundColor: COLORS.primarySoft },
              ]}
            >
              <FileText size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.menuText}>Informasi Data Diri</Text>
              <Text style={styles.menuSubText}>
                Lihat NIP, NIK, departemen & jabatan
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={COLORS.textLight} />
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View
              style={[
                styles.menuIconWrap,
                { backgroundColor: COLORS.successLight },
              ]}
            >
              <MapPin size={20} color={COLORS.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Titik Area Presensi</Text>
              <Text style={styles.menuSubText}>
                {ABSENSI_GEOFENCE.name} (Radius Maks.{' '}
                {formatDistance(ABSENSI_GEOFENCE.radiusMeters)})
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View
              style={[
                styles.menuIconWrap,
                { backgroundColor: COLORS.primarySoft },
              ]}
            >
              <ShieldCheck size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>Otentikasi Biometrik 2-Faktor</Text>
              <Text style={styles.menuSubText}>
                Face Recognition AI + Validasi Koordinat GPS
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <View style={styles.menuLeft}>
            <View
              style={[
                styles.menuIconWrap,
                { backgroundColor: COLORS.dangerLight },
              ]}
            >
              <LogOut size={20} color={COLORS.danger} />
            </View>
            <View>
              <Text style={[styles.menuText, { color: COLORS.danger }]}>
                Keluar dari Akun
              </Text>
              <Text style={styles.menuSubText}>
                Akhiri sesi aktif pada perangkat ini
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Modal Detail Karyawan */}
      <Modal visible={detailVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Informasi Data Diri</Text>
              <TouchableOpacity
                onPress={() => setDetailVisible(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : karyawanDetail ? (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailCard}>
                  <DetailRow
                    label="Nama Lengkap"
                    value={karyawanDetail.nama_lengkap}
                  />
                  <DetailRow label="NIP" value={karyawanDetail.nip || '-'} />
                  <DetailRow label="NIK" value={karyawanDetail.nik || '-'} />
                  <DetailRow
                    label="Departemen"
                    value={karyawanDetail.nama_departemen || '-'}
                  />
                  <DetailRow
                    label="Level Jabatan"
                    value={karyawanDetail.nama_level || '-'}
                  />
                  <DetailRow
                    label="Status Kepegawaian"
                    value={karyawanDetail.status_kepegawaian || '-'}
                  />
                  <DetailRow
                    label="Email"
                    value={karyawanDetail.email || '-'}
                  />
                  <DetailRow
                    label="No. Handphone"
                    value={karyawanDetail.handphone || '-'}
                  />
                  <DetailRow
                    label="Atasan Langsung"
                    value={karyawanDetail.nama_atasan || '-'}
                  />
                  <DetailRow
                    label="Sisa Cuti Tahunan"
                    value={`${karyawanDetail.sisa_cuti ?? 0} Hari`}
                  />
                  <DetailRow
                    label="Tanggal Bergabung"
                    value={
                      karyawanDetail.tanggal_masuk
                        ? new Date(
                            karyawanDetail.tanggal_masuk
                          ).toLocaleDateString('id-ID')
                        : '-'
                    }
                  />
                </View>
              </ScrollView>
            ) : (
              <View style={styles.loaderContainer}>
                <Text style={{ color: COLORS.textMuted }}>
                  Gagal memuat data kepegawaian.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 58,
    paddingBottom: 36,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarWrap: {
    width: 84,
    height: 84,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: '#93C5FD',
    fontWeight: '600',
    marginBottom: 12,
  },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  roleText: {
    fontSize: 11,
    color: '#E0F2FE',
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  menuContainer: {
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoutItem: {
    marginTop: 12,
    borderColor: COLORS.dangerBorder,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  menuSubText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 22,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#F1F5F9',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 40,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
  },
});
