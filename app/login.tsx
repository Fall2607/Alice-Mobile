import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../src/services/authService';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { COLORS } from '../src/config/theme';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Data Belum Lengkap', 'Masukkan email dan kata sandi Anda.');
      return;
    }

    setLoading(true);
    try {
      await authService.login(username.trim(), password);
      setLoading(false);
      router.replace('/(tabs)');
    } catch (error: any) {
      setLoading(false);
      Alert.alert(
        'Gagal Masuk',
        error.message || 'Email atau kata sandi yang Anda masukkan tidak sesuai.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* Top Brand Section */}
          <View style={styles.brandSection}>
            <View style={styles.logoCard}>
              <Image
                source={require('../assets/alice.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.badgePill}>
              <ShieldCheck size={12} color={COLORS.secondary} />
              <Text style={styles.badgeText}>PORTAL KEPEGAWAIAN RESMI</Text>
            </View>
            <Text style={styles.title}>Alice Mobile</Text>
            <Text style={styles.subtitle}>
              Sistem Informasi Presensi & Layanan Mandiri RSU Avisena
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Masuk ke Akun Staf</Text>
            <Text style={styles.formSub}>
              Gunakan kredensial email yang terdaftar pada sistem HRIS Alice.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>ALAMAT EMAIL</Text>
              <View style={styles.inputContainer}>
                <Mail
                  color={COLORS.textMuted}
                  size={18}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="nama@avisenahospitals.com"
                  placeholderTextColor={COLORS.textLight}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>KATA SANDI</Text>
              <View style={styles.inputContainer}>
                <Lock
                  color={COLORS.textMuted}
                  size={18}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Masukkan kata sandi"
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword ? (
                    <EyeOff color={COLORS.textMuted} size={18} />
                  ) : (
                    <Eye color={COLORS.textMuted} size={18} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Masuk sebagai Staf</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            © {new Date().getFullYear()} RSU Avisena Cimahi • Alice HRIS
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCard: {
    width: 82,
    height: 82,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BAE6FD',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#93C5FD',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  formSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  eyeButton: {
    padding: 8,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footerText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 28,
    fontSize: 11,
    fontWeight: '600',
  },
});
