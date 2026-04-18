import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

export default function RootLayout() {
  return (
    <Provider>
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false
        }}
      >
        <Stack.Screen name="index" options={{ title: "" }} />
        <Stack.Screen name="login" options={{ title: "Login" }} />
        <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
        <Stack.Screen name="users" options={{ title: "Users" }} />
        <Stack.Screen name="user-detail" options={{ title: "User Detail" }} />
        <Stack.Screen name="deposits" options={{ title: "Deposits" }} />
        <Stack.Screen name="partners" options={{ title: "Partners" }} />
        <Stack.Screen name="pools" options={{ title: "Pools" }} />
        <Stack.Screen name="config" options={{ title: "Config" }} />
        <Stack.Screen name="logs" options={{ title: "Logs" }} />
        <Stack.Screen name="node-applications" options={{ title: "Node Applications" }} />
        <Stack.Screen name="cards" options={{ title: "Cards" }} />
        <Stack.Screen name="stakes" options={{ title: "Stakes" }} />
        {/* DApp 用户端 */}
        <Stack.Screen name="(dapp)" options={{ headerShown: false }} />
      </Stack>
      <Toast />
    </Provider>
  );
}
