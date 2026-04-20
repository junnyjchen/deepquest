import { Stack } from 'expo-router';

export default function DappLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: "DeepQuest" }} />
      <Stack.Screen name="profile" options={{ title: "个人中心" }} />
      <Stack.Screen name="team" options={{ title: "团队" }} />
      <Stack.Screen name="stakes" options={{ title: "质押记录" }} />
      <Stack.Screen name="rewards" options={{ title: "收益记录" }} />
      <Stack.Screen name="withdrawals" options={{ title: "提现记录" }} />
      <Stack.Screen name="nodes" options={{ title: "节点申请" }} />
      <Stack.Screen name="help" options={{ title: "帮助中心" }} />
    </Stack>
  );
}
