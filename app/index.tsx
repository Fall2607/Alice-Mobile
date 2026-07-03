import { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../src/services/authService';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkLoginStatus();
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
      <Image 
        source={require('../assets/alice.png')} 
        style={styles.logo} 
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
    width: 120,
    height: 120,
    borderRadius: 30,
  }
});
