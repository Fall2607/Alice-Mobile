import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { attendanceService } from '../src/services/attendanceService';

const faceApiHtml = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js"></script>
</head>
<body>
  <img id="img" style="display:none;" />
  <script>
    let modelsLoaded = false;
    const MODEL_URL = "https://cimahi.avisenahospitals.com/models";
    
    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
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
           const detection = await faceapi
              .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 }))
              .withFaceLandmarks()
              .withFaceDescriptor();
              
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
  
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Menginisialisasi Kamera...');
  const [modelsReady, setModelsReady] = useState(false);
  
  // State untuk Early Checkout Modal
  const [showEarlyModal, setShowEarlyModal] = useState(false);
  const [earlyMessage, setEarlyMessage] = useState('');
  const [lastDescriptor, setLastDescriptor] = useState<number[] | null>(null);

  const cameraRef = useRef<any>(null);
  const webviewRef = useRef<any>(null);

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator color="#FFF" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', color: '#FFF' }}>Aplikasi membutuhkan akses kamera untuk absensi.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Izinkan Kamera</Text>
        </TouchableOpacity>
      </View>
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
        Alert.alert('Gagal', 'Wajah tidak terdeteksi di foto. Coba lagi.');
      } else if (data.type === 'ERROR') {
        setLoading(false);
        Alert.alert('Error AI', data.message);
      } else if (data.type === 'SUCCESS') {
        // Descriptor didapat! Lanjut tembak API
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
      Alert.alert('Mohon Tunggu', 'Sistem AI sedang memuat model pengenalan wajah...');
      return;
    }
    
    setLoading(true);
    setLoadingText('Memindai Wajah...');
    
    try {
      // Pangkas kualitas ke 0.2 dan lompati pemrosesan lanjutan agar 3x lipat lebih cepat
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.2, skipProcessing: true });
      // Inject base64 ke WebView
      webviewRef.current.injectJavaScript(`window.processBase64("${photo.base64}"); true;`);
    } catch (e) {
      setLoading(false);
      Alert.alert('Error', 'Gagal mengambil foto.');
    }
  };

  const submitToAPI = async (descriptor: number[], forceEarlyOut: boolean) => {
    setLoadingText('Mencocokkan Wajah di Server...');
    try {
      const result = await attendanceService.verifyFace(descriptor, type as 'in'|'out', forceEarlyOut);
      
      setLoading(false);
      Alert.alert(
        'Absensi Berhasil',
        result.message || `Anda berhasil Check-${type === 'in' ? 'In' : 'Out'}.`,
        [{ text: 'OK', onPress: () => router.replace({ pathname: '/(tabs)', params: { newAbsenType: type, newAbsenTime: result.user?.waktu, existingMasuk } }) }]
      );
    } catch (error: any) {
      setLoading(false);
      
      if (error.isEarly) {
        setEarlyMessage(error.message);
        setShowEarlyModal(true);
      } else {
        Alert.alert('Gagal', error.message || 'Gagal memproses absensi.');
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
      {/* Hidden WebView untuk TFJS */}
      <View style={{ height: 0, width: 0, opacity: 0 }}>
        <WebView
          ref={webviewRef}
          source={{ html: faceApiHtml, baseUrl: 'https://cimahi.avisenahospitals.com' }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
        />
      </View>

      <CameraView 
        style={styles.camera} 
        facing="front"
        ref={cameraRef}
      />
      
      {/* Overlay menggunakan absolute positioning */}
      <View style={[styles.overlay, StyleSheet.absoluteFill]}>
        <View style={styles.scanArea} />
        
        <Text style={styles.instruction}>
          {!modelsReady ? 'Menyiapkan Sistem AI...' : 'Posisikan wajah Anda di dalam kotak'}
        </Text>

        <View style={styles.bottomControls}>
          <TouchableOpacity 
            style={[styles.captureBtn, (loading || !modelsReady) && styles.captureBtnDisabled]} 
            onPress={takePictureAndProcess}
            disabled={loading || !modelsReady}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.captureText}>{loadingText}</Text>
              </>
            ) : (
              <>
                <ShieldCheck color="#FFF" size={20} style={{ marginRight: 8 }} />
                <Text style={styles.captureText}>Scan Wajah</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Early Checkout (Amber Warning) */}
      <Modal
        visible={showEarlyModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Clock size={40} color="#F59E0B" />
            </View>
            <Text style={styles.modalTitle}>Pulang Cepat?</Text>
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
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 280,
    height: 320,
    borderWidth: 2,
    borderColor: '#0EA5E9', 
    borderRadius: 24,
    backgroundColor: 'transparent',
    marginBottom: 40,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  instruction: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 40,
    letterSpacing: 1,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  captureBtn: {
    backgroundColor: '#0EA5E9',
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    alignItems: 'center',
  },
  captureBtnDisabled: {
    backgroundColor: '#7DD3FC',
    elevation: 0,
    shadowOpacity: 0,
  },
  captureText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  btn: {
    backgroundColor: '#0EA5E9',
    padding: 12,
    borderRadius: 8,
    margin: 20,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    elevation: 10,
  },
  modalIconWrap: {
    width: 80,
    height: 80,
    backgroundColor: '#FEF3C7',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#FDE68A',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: '#64748B',
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
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: '#64748B',
    fontWeight: '800',
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalBtnConfirmText: {
    color: '#FFFFFF',
    fontWeight: '900',
  }
});
