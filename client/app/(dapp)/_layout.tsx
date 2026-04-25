import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function DappLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A12' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'DAPP' }} />
        <Stack.Screen name="invite" options={{ title: 'Invite Friends', presentation: 'modal' }} />
        <Stack.Screen name="nodes" options={{ title: 'Node Center' }} />
        <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
        <Stack.Screen name="rewards" options={{ title: 'My Rewards' }} />
        <Stack.Screen name="stakes" options={{ title: 'My Stakes' }} />
        <Stack.Screen name="team" options={{ title: 'My Team' }} />
        <Stack.Screen name="withdrawals" options={{ title: 'Withdrawals' }} />
      </Stack>
    </>
  );
}
