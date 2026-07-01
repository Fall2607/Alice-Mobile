import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, Send, CheckCircle2, Calendar as CalendarIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function LemburScreen() {
  const [lemburForm, setLemburForm] = useState({
    tanggal_lembur: '',
    jam_mulai: '',
    jam_selesai: '',
    kegiatan: '',
  });

  const [showPickerDate, setShowPickerDate] = useState(false);
  const [showPickerTimeStart, setShowPickerTimeStart] = useState(false);
  const [showPickerTimeEnd, setShowPickerTimeEnd] = useState(false);
  const [lemburDate, setLemburDate] = useState(new Date());
  const [timeStart, setTimeStart] = useState(new Date());
  const [timeEnd, setTimeEnd] = useState(new Date());

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowPickerDate(Platform.OS === 'ios');
    if (selectedDate) {
      setLemburDate(selectedDate);
      setLemburForm({ ...lemburForm, tanggal_lembur: selectedDate.toISOString().split('T')[0] });
    }
  };

  const onChangeTimeStart = (event: any, selectedDate?: Date) => {
    setShowPickerTimeStart(Platform.OS === 'ios');
    if (selectedDate) {
      setTimeStart(selectedDate);
      const timeStr = selectedDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      setLemburForm({ ...lemburForm, jam_mulai: timeStr });
    }
  };

  const onChangeTimeEnd = (event: any, selectedDate?: Date) => {
    setShowPickerTimeEnd(Platform.OS === 'ios');
    if (selectedDate) {
      setTimeEnd(selectedDate);
      const timeStr = selectedDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      setLemburForm({ ...lemburForm, jam_selesai: timeStr });
    }
  };

  const handleSubmit = () => {
    // Dummy submit
    Alert.alert('Sukses', 'Pengajuan lembur berhasil dikirim.');
    setLemburForm({ tanggal_lembur: '', jam_mulai: '', jam_selesai: '', kegiatan: '' });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container}>
        <View style={styles.topBackground}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Manajemen Lembur</Text>
              <Text style={styles.headerSubtitle}>Total Bulan Ini</Text>
            </View>
            <View style={styles.balanceBox}>
              <Text style={styles.balanceValue}>15</Text>
              <Text style={styles.balanceLabel}>Jam</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomContentTray}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Clock color="#1E293B" size={20} />
              <Text style={styles.formTitle}>Formulir Lembur</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TANGGAL LEMBUR</Text>
              <TouchableOpacity onPress={() => setShowPickerDate(true)} activeOpacity={0.7} style={styles.datePickerBtn}>
                <Text style={[styles.datePickerText, !lemburForm.tanggal_lembur && styles.placeholderText]}>
                  {lemburForm.tanggal_lembur || 'YYYY-MM-DD'}
                </Text>
                <CalendarIcon color="#94A3B8" size={20} />
              </TouchableOpacity>
              {showPickerDate && (
                <DateTimePicker
                  value={lemburDate}
                  mode="date"
                  display="default"
                  onChange={onChangeDate}
                />
              )}
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>JAM MULAI</Text>
                <TouchableOpacity onPress={() => setShowPickerTimeStart(true)} activeOpacity={0.7} style={styles.datePickerBtn}>
                  <Text style={[styles.datePickerText, !lemburForm.jam_mulai && styles.placeholderText]}>
                    {lemburForm.jam_mulai || 'HH:MM'}
                  </Text>
                  <Clock color="#94A3B8" size={20} />
                </TouchableOpacity>
                {showPickerTimeStart && (
                  <DateTimePicker
                    value={timeStart}
                    mode="time"
                    display="default"
                    onChange={onChangeTimeStart}
                  />
                )}
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>JAM SELESAI</Text>
                <TouchableOpacity onPress={() => setShowPickerTimeEnd(true)} activeOpacity={0.7} style={styles.datePickerBtn}>
                  <Text style={[styles.datePickerText, !lemburForm.jam_selesai && styles.placeholderText]}>
                    {lemburForm.jam_selesai || 'HH:MM'}
                  </Text>
                  <Clock color="#94A3B8" size={20} />
                </TouchableOpacity>
                {showPickerTimeEnd && (
                  <DateTimePicker
                    value={timeEnd}
                    mode="time"
                    display="default"
                    onChange={onChangeTimeEnd}
                  />
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>KEGIATAN PEKERJAAN</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tuliskan deskripsi pekerjaan lembur..."
                placeholderTextColor="#94A3B8"
                value={lemburForm.kegiatan}
                onChangeText={(text) => setLemburForm({ ...lemburForm, kegiatan: text })}
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
            <Text style={styles.sectionTitle}>Riwayat Lembur</Text>
            
            <View style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={styles.badgeApproved}>
                  <Text style={styles.badgeTextApproved}>Approved</Text>
                </View>
                <Text style={styles.historyDate}>28 Jun 2026</Text>
              </View>
              <View style={styles.historyBody}>
                <Text style={styles.historyType}>Setup Server Backend</Text>
                <View style={styles.timeWrap}>
                  <Text style={styles.historyTime}>18:00 - 22:00 <Text style={styles.historyHours}>(4 Jam)</Text></Text>
                </View>
              </View>
            </View>

            <View style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={styles.badgePending}>
                  <Text style={styles.badgeTextPending}>Pending</Text>
                </View>
                <Text style={styles.historyDate}>01 Jul 2026</Text>
              </View>
              <View style={styles.historyBody}>
                <Text style={styles.historyType}>Maintanance Database</Text>
                <View style={styles.timeWrap}>
                  <Text style={styles.historyTime}>17:00 - 19:30 <Text style={styles.historyHours}>(2.5 Jam)</Text></Text>
                </View>
              </View>
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
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
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
    marginBottom: 12,
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
  historyBody: {
    flexDirection: 'column',
    gap: 4,
  },
  historyType: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTime: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  historyHours: {
    color: '#0EA5E9',
    fontWeight: '800',
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
