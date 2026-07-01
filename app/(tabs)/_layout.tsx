import { Tabs } from 'expo-router';
import { ScanFace, CalendarDays, User, Palmtree, Clock } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0EA5E9',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Absensi',
          tabBarIcon: ({ color, size }) => (
            <ScanFace color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="jadwal"
        options={{
          title: 'Jadwal',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cuti"
        options={{
          title: 'Cuti',
          tabBarIcon: ({ color, size }) => (
            <Palmtree color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="lembur"
        options={{
          title: 'Lembur',
          tabBarIcon: ({ color, size }) => (
            <Clock color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
