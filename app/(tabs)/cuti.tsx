import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, Send, ChevronDown, Calendar as CalendarIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CutiScreen() {
  const [leaveForm, setLeaveForm] = useState({
    tanggal_mulai: '',
    tanggal_selesai: '',
    kategori: 'Cuti Tahunan',
    alasan: '',
  });

  const [showPickerStart, setShowPickerStart] = useState(false);
  const [showPickerEnd, setShowPickerEnd] = useState(false);
  const [dateStart, setDateStart] = useState(new Date());
  const [dateEnd, setDateEnd] = useState(new Date());

  const onChangeStart = (event: any, selectedDate?: Date) => {
    setShowPickerStart(Platform.OS === 'ios');
    if (selectedDate) {
      setDateStart(selectedDate);
      setLeaveForm({ ...leaveForm, tanggal_mulai: selectedDate.toISOString().split('T')[0] });
    }
  };

  const onChangeEnd = (event: any, selectedDate?: Date) => {
    setShowPickerEnd(Platform.OS === 'ios');
    if (selectedDate) {
      setDateEnd(selectedDate);
      setLeaveForm({ ...leaveForm, tanggal_selesai: selectedDate.toISOString().split('T')[0] });
    }
  };

  const handleSubmit = () => {
    // Dummy submit
    Alert.alert('Sukses', 'Pengajuan cuti berhasil dikirim.');
    setLeaveForm({ tanggal_mulai: '', tanggal_selesai: '', kategori: 'Cuti Tahunan', alasan: '' });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container}>
        <View style={styles.topBackground}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Manajemen Cuti</Text>
              <Text style={styles.headerSubtitle}>Riwayat Pengajuan</Text>
            </View>
            <View style={styles.balanceBox}>
              <Text style={styles.balanceValue}>12</Text>
              <Text style={styles.balanceLabel}>Hari</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomContentTray}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <CalendarDays color="#1E293B" size={20} />
              <Text style={styles.formTitle}>Formulir Cuti</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TANGGAL MULAI</Text>
              <TouchableOpacity onPress={() => setShowPickerStart(true)} activeOpacity={0.7} style={styles.datePickerBtn}>
                <Text style={[styles.datePickerText, !leaveForm.tanggal_mulai && styles.placeholderText]}>
                  {leaveForm.tanggal_mulai || 'YYYY-MM-DD'}
                </Text>
                <CalendarIcon color="#94A3B8" size={20} />
              </TouchableOpacity>
              {showPickerStart && (
                <DateTimePicker
                  value={dateStart}
                  mode="date"
                  display="default"
                  onChange={onChangeStart}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TANGGAL SELESAI</Text>
              <TouchableOpacity onPress={() => setShowPickerEnd(true)} activeOpacity={0.7} style={styles.datePickerBtn}>
                <Text style={[styles.datePickerText, !leaveForm.tanggal_selesai && styles.placeholderText]}>
                  {leaveForm.tanggal_selesai || 'YYYY-MM-DD'}
                </Text>
                <CalendarIcon color="#94A3B8" size={20} />
              </TouchableOpacity>
              {showPickerEnd && (
                <DateTimePicker
                  value={dateEnd}
                  mode="date"
                  display="default"
                  minimumDate={dateStart}
                  onChange={onChangeEnd}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>KATEGORI IZIN</Text>
              <View style={styles.selectContainer}>
                <TextInput
                  style={styles.input}
                  value={leaveForm.kategori}
                  editable={false} // dummy select
                />
                <ChevronDown color="#94A3B8" size={20} style={styles.selectIcon} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CATATAN / KETERANGAN</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tuliskan alasan pengajuan cuti..."
                placeholderTextColor="#94A3B8"
                value={leaveForm.alasan}
                onChangeText={(text) => setLeaveForm({ ...leaveForm, alasan: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
              <Send color="#FFFFFF" size={18} />
              <Text style={styles.submitBtnText}>SUBMIT PERMOHONAN</Text>
            </TouchableOpacity>
          </View>

          {/* Dummy History */}
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>Riwayat Cuti</Text>
            <View style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={styles.badgeApproved}>
                  <Text style={styles.badgeTextApproved}>Approved</Text>
                </View>
                <Text style={styles.historyDate}>12 Apr - 14 Apr</Text>
              </View>
              <Text style={styles.historyType}>Cuti Tahunan</Text>
              <Text style={styles.historyReason}>Pulang kampung untuk acara keluarga</Text>
            </View>

            <View style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={styles.badgePending}>
                  <Text style={styles.badgeTextPending}>Pending</Text>
                </View>
                <Text style={styles.historyDate}>20 Jun - 21 Jun</Text>
              </View>
              <Text style={styles.historyType}>Cuti Sakit</Text>
              <Text style={styles.historyReason}>Checkup medis ke rumah sakit</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBackground: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 80,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0EA5E9',
    marginTop: 4,
  },
  balanceBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0EA5E9',
    lineHeight: 26,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  bottomContentTray: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -40,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    minHeight: 500,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  selectContainer: {
    position: 'relative',
  },
  selectIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  submitBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  historyContainer: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeApproved: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeTextApproved: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgePending: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeTextPending: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  historyType: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  historyReason: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  datePickerBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  placeholderText: {
    color: '#94A3B8',
  },
});
