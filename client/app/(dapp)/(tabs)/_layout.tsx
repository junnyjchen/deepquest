import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';

const BG_DARK = '#0A0A12';
const YELLOW = '#FFD23F';

export default function DappTabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: BG_DARK,
          borderTopWidth: 1,
          borderTopColor: '#303040',
          height: Platform.OS === 'web' ? 60 : 55 + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? 0 : 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: YELLOW,
        tabBarInactiveTintColor: '#A0A0B0',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: '团队',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stakes"
        options={{
          href: null, // 不显示在 Tab 栏
          title: '质押记录',
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          href: null, // 不显示在 Tab 栏
          title: '收益记录',
        }}
      />
      <Tabs.Screen
        name="withdrawals"
        options={{
          href: null, // 不显示在 Tab 栏
          title: '提现记录',
        }}
      />
      <Tabs.Screen
        name="nodes"
        options={{
          href: null, // 不显示在 Tab 栏
          title: '节点申请',
        }}
      />
    </Tabs>
  );
}
