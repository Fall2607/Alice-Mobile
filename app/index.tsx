import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../src/services/authService';

export default function Index() {
  const router = useRouter();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Jalankan animasi secara paralel
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Setelah animasi 800ms selesai, cek login status
      checkLoginStatus();
    });
  }, []);

  const checkLoginStatus = async () => {
    try {
      const user = await authService.getUser();
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    } catch (e) {
      router.replace('/login');
    }
  };

  return (
    <View style={styles.container}>
      <Animated.Image 
        source={require('../assets/alice.png')} 
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]} 
        resizeMode="contain" 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9', // Mengikuti warna slate aplikasi
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 35,
  }
});
