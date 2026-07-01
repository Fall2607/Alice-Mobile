import { View, Text, StyleSheet } from 'react-native';
import { CalendarDays } from 'lucide-react-native';

export default function Jadwal() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <CalendarDays size={48} color="#0EA5E9" />
        </View>
        <Text style={styles.title}>Jadwal Kerja</Text>
        <Text style={styles.subtitle}>
          Fitur untuk melihat jadwal kerja 1 bulan ke depan sedang dalam tahap pengembangan.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    backgroundColor: '#E0F2FE',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  }
});
