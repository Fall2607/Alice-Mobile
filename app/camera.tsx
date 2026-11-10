import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Clock,
  ShieldCheck,
  X,
  MapPin,
  ScanFace,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { attendanceService } from '../src/services/attendanceService';
import { useGpsGate } from '../src/hooks/useGpsGate';
import GpsGatePanel from '../src/components/GpsGatePanel';
import { ABSENSI_GEOFENCE, formatDistance } from '../src/utils/geofence';
import { COLORS } from '../src/config/theme';

const faceApiHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js"></script>
</head>
<body style="margin:0;padding:0;background:#000;">
  <img id="img" style="display:none;" />
  <canvas id="workCanvas" style="display:none;"></canvas>
  <script>
    let modelsLoaded = false;
    const MODEL_URL = "https://cimahi.avisenahospitals.com/models";
    
    async function loadModels() {
      try {
        if (window.faceapi && faceapi.tf) {
          try {
            await faceapi.tf.setBackend('webgl');
            await faceapi.tf.ready();
          } catch(err) {
            console.log('WebGL backend init notice:', err);
          }
        }
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        // Warmup ke-3 jaringan (Detector, Landmarks, dan ResNet Recognition) agar shader WebGL sudah terkompilasi penuh
        try {
          const dummy = document.getElementById('workCanvas');
          dummy.width = 160;
          dummy.height = 160;
          await faceapi.detectSingleFace(dummy, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 }));
          await faceapi.nets.faceLandmark68Net.detectLandmarks(dummy);
          await faceapi.nets.faceRecognitionNet.computeFaceDescriptor(dummy);
        } catch (_) {}

        modelsLoaded = true;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MODELS_LOADED' }));
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: e.message }));
      }
    }
    
    loadModels();
    
    window.processBase64 = function(base64Str) {
      if (!modelsLoaded) {
         window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'Model AI belum siap. Tunggu sebentar.' }));
         return;
      }
      
      const img = document.getElementById('img');
      img.onload = async () => {
         try {
           // Perkecil resolusi foto kamera (12MP+) ke canvas 360px agar ekstraksi Tensor 100x lebih ringan & instan
           const workCanvas = document.getElementById('workCanvas');
           const maxDim = 360;
           const w = img.naturalWidth || img.width || maxDim;
           const h = img.naturalHeight || img.height || maxDim;
           const scale = Math.min(1, maxDim / Math.max(w, h));
           workCanvas.width = Math.max(1, Math.round(w * scale));
           workCanvas.height = Math.max(1, Math.round(h * scale));
           const ctx = workCanvas.getContext('2d');
           ctx.drawImage(img, 0, 0, workCanvas.width, workCanvas.height);

           let detection = await faceapi
              .detectSingleFace(workCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
              .withFaceLandmarks()
              .withFaceDescriptor();

           // Failsafe jika wajah agak jauh
           if (!detection) {
              detection = await faceapi
                .detectSingleFace(workCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 }))
                .withFaceLandmarks()
                .withFaceDescriptor();
           }
              
           if (!detection) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NO_FACE_DETECTED' }));
           } else {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SUCCESS', descriptor: Array.from(detection.descriptor) }));
           }
         } catch(e) {
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: e.message }));
         }
      };
      img.src = "data:image/jpeg;base64," + base64Str;
    };
  </script>
</body>
</html>
`;

export default function CameraScreen() {
  const router = useRouter();
  const { type, existingMasuk } = useLocalSearchParams(); // 'in' atau 'out'
  const [permission, requestPermission] = useCameraPermissions();
  const gps = useGpsGate(Boolean(permission?.granted));
  const gpsUnlocked = gps.isReady && gps.inArea;

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Memverifikasi Biometrik...');
  const [modelsReady, setModelsReady] = useState(false);

  // State untuk Early Checkout Modal
  const [showEarlyModal, setShowEarlyModal] = useState(false);
  const [earlyMessage, setEarlyMessage] = useState('');
  const [lastDescriptor, setLastDescriptor] = useState<number[] | null>(null);

  const cameraRef = useRef<any>(null);
  const webviewRef = useRef<any>(null);

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconWrap}>
            <ScanFace size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.permissionTitle}>Izin Kamera Diperlukan</Text>
          <Text style={styles.permissionDesc}>
            Aplikasi Alice memerlukan akses kamera depan untuk memverifikasi biometrik wajah Anda saat absensi.
          </Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={requestPermission}
            activeOpacity={0.85}
          >
            <Text style={styles.permissionBtnText}>Izinkan Akses Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permissionCancelBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.permissionCancelText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Handle pesan dari WebView
  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MODELS_LOADED') {
        setModelsReady(true);
      } else if (data.type === 'NO_FACE_DETECTED') {
        setLoading(false);
        Alert.alert(
          'Wajah Tidak Terdeteksi',
          'Pastikan posisi wajah menghadap tegak ke arah kamera dengan pencahayaan yang cukup.'
        );
      } else if (data.type === 'ERROR') {
        setLoading(false);
        Alert.alert('Gangguan Sistem AI', data.message);
      } else if (data.type === 'SUCCESS') {
        setLastDescriptor(data.descriptor);
        submitToAPI(data.descriptor, false);
      }
    } catch (err) {
      console.log('Error parsing webview message', err);
    }
  };

  const takePictureAndProcess = async () => {
    if (!cameraRef.current || !webviewRef.current) return;
    if (!modelsReady) {
      Alert.alert(
        'Menyiapkan Biometrik',
        'Sistem AI sedang memuat model pengenalan wajah. Silakan tunggu beberapa detik.'
      );
      return;
    }

    const latestLoc = gps.getLatestPosition();
    if (!latestLoc || !gps.inArea) {
      Alert.alert(
        'Lokasi Tidak Valid',
        'Pastikan GPS aktif dan Anda berada di dalam area radius RSU Avisena.'
      );
      return;
    }

    setLoading(true);
    setLoadingText('Memindai Biometrik Wajah...');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.25,
        skipProcessing: true,
      });
      webviewRef.current.injectJavaScript(
        `window.processBase64("${photo.base64}"); true;`
      );
    } catch (e) {
      setLoading(false);
      Alert.alert('Gagal', 'Tidak dapat mengambil gambar dari kamera.');
    }
  };

  const submitToAPI = async (
    descriptor: number[],
    forceEarlyOut: boolean,
    isForcedType?: 'in' | 'out',
    forceNewCheckIn: boolean = false
  ) => {
    const loc = gps.getLatestPosition();
    if (!loc) {
      setLoading(false);
      Alert.alert(
        'GPS Tidak Aktif',
        'Lokasi perangkat tidak terdeteksi. Pastikan GPS Anda menyala.'
      );
      return;
    }

    setLoadingText('Memverifikasi Wajah & Area...');
    try {
      const actualType = isForcedType || (type as 'in' | 'out');
      const result = await attendanceService.verifyFace({
        descriptor,
        type: actualType,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        forceEarlyOut,
        forceNewCheckIn,
      });

      setLoading(false);
      Alert.alert(
        'Presensi Berhasil',
        result.message ||
          `Anda berhasil Check-${actualType === 'in' ? 'In' : 'Out'}.`,
        [
          {
            text: 'Selesai',
            onPress: () =>
              router.replace({
                pathname: '/(tabs)',
                params: {
                  newAbsenType: actualType,
                  newAbsenTime: result.user?.waktu,
                  existingMasuk,
                },
              }),
          },
        ]
      );
    } catch (error: any) {
      setLoading(false);

      if (error.isEarly) {
        setEarlyMessage(error.message);
        setShowEarlyModal(true);
      } else if (error.isUnresolvedCheckout) {
        Alert.alert(
          'Sesi Sebelumnya Belum Selesai',
          error.message ||
            'Anda memiliki sesi shift sebelumnya yang belum dilakukan Check-Out.',
          [
            {
              text: 'Mulai Check-In Baru',
              onPress: () => {
                if (lastDescriptor) {
                  setLoading(true);
                  submitToAPI(lastDescriptor, false, 'in', true);
                }
              },
            },
            {
              text: 'Check-Out Sesi Lama',
              onPress: () => {
                if (lastDescriptor) {
                  setLoading(true);
                  submitToAPI(lastDescriptor, false, 'out', false);
                }
              },
            },
            { text: 'Batal', style: 'cancel' },
          ]
        );
      } else if (error.isOutOfArea) {
        gps.retry();
        Alert.alert('Di Luar Area Absensi', error.message);
      } else {
        Alert.alert(
          'Verifikasi Gagal',
          error.message || 'Gagal memproses presensi.'
        );
      }
    }
  };

  const handleForceEarlyOut = () => {
    setShowEarlyModal(false);
    if (lastDescriptor) {
      setLoading(true);
      submitToAPI(lastDescriptor, true);
    }
  };

  return (
    <View style={styles.container}>
      {/* Hidden WebView untuk TFJS / Face-API (diberi layout offscreen agar akselerasi WebGL GPU tetap aktif) */}
      <View style={styles.hiddenWebView} pointerEvents="none">
        <WebView
          ref={webviewRef}
          source={{
            html: faceApiHtml,
            baseUrl: 'https://cimahi.avisenahospitals.com',
          }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={true}
          androidHardwareAccelerationDisabled={false}
          originWhitelist={['*']}
        />
      </View>

      {!gpsUnlocked ? (
        <SafeAreaView style={styles.gateWrapper}>
          <View style={styles.gateHeaderBar}>
            <View style={styles.gateHeaderLeft}>
              <View style={styles.gateHeaderIcon}>
                <ScanFace size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.gateHeaderTitle}>Presensi Biometrik</Text>
                <Text style={styles.gateHeaderSub}>
                  Validasi Area Geofence & Wajah
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => router.back()}
            >
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.gateBody}>
            <GpsGatePanel gps={gps} onCancel={() => router.back()} />
          </View>
        </SafeAreaView>
      ) : (
        <>
          <CameraView style={styles.camera} facing="front" ref={cameraRef} />

          {/* Overlay Kamera */}
          <View style={[styles.overlay, StyleSheet.absoluteFill]}>
            {/* Top Bar Info */}
            <View style={styles.topCameraBar}>
              <View style={styles.gpsStatusPill}>
                <CheckCircle2 size={14} color="#10B981" />
                <Text style={styles.gpsStatusText}>
                  Dalam Area {ABSENSI_GEOFENCE.name} ({gps.formattedDistance})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.cameraCloseBtn}
                onPress={() => router.back()}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Area Frame Wajah */}
            <View style={styles.scanFrameWrap}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>

              <View style={styles.instructionBadge}>
                <Text style={styles.instructionText}>
                  {!modelsReady
                    ? 'Menyiapkan Mesin Biometrik AI...'
                    : `Posisikan wajah untuk Check-${
                        type === 'in' ? 'In' : 'Out'
                      }`}
                </Text>
              </View>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              <TouchableOpacity
                style={[
                  styles.captureBtn,
                  type === 'out' && styles.captureBtnOut,
                  (loading || !modelsReady) && styles.captureBtnDisabled,
                ]}
                onPress={takePictureAndProcess}
                disabled={loading || !modelsReady}
                activeOpacity={0.85}
              >
                {loading ? (
                  <>
                    <ActivityIndicator
                      color="#FFF"
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.captureText}>{loadingText}</Text>
                  </>
                ) : (
                  <>
                    <ShieldCheck
                      color="#FFF"
                      size={20}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.captureText}>
                      {type === 'in'
                        ? 'Verifikasi Check-In'
                        : 'Verifikasi Check-Out'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Modal Early Checkout (Amber Warning) */}
      <Modal visible={showEarlyModal} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Clock size={36} color={COLORS.warning} />
            </View>
            <Text style={styles.modalTitle}>Pulang Lebih Awal?</Text>
            <Text style={styles.modalDesc}>{earlyMessage}</Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowEarlyModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={handleForceEarlyOut}
              >
                <Text style={styles.modalBtnConfirmText}>Tetap Pulang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  permissionIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permissionBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  permissionCancelBtn: {
    paddingVertical: 10,
  },
  permissionCancelText: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  gateWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gateHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  gateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gateHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  gateHeaderSub: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 44,
    paddingHorizontal: 20,
  },
  topCameraBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  gpsStatusText: {
    color: '#ECFDF5',
    fontSize: 12,
    fontWeight: '700',
  },
  cameraCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  scanFrameWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: 265,
    height: 320,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'transparent',
    position: 'relative',
    marginBottom: 24,
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: COLORS.secondary,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 34,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 34,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 34,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 34,
  },
  instructionBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bottomControls: {
    width: '100%',
    alignItems: 'center',
  },
  captureBtn: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 20,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnOut: {
    backgroundColor: COLORS.primaryDark,
    shadowColor: COLORS.primaryDark,
  },
  captureBtnDisabled: {
    backgroundColor: '#64748B',
    elevation: 0,
    shadowOpacity: 0,
  },
  captureText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 26,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
    elevation: 10,
  },
  modalIconWrap: {
    width: 72,
    height: 72,
    backgroundColor: COLORS.warningLight,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.warningBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 13,
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.warning,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  hiddenWebView: {
    position: 'absolute',
    top: -500,
    left: -500,
    width: 150,
    height: 150,
    opacity: 0.01,
  },
});
