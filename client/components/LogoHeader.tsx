import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// 颜色常量
const YELLOW = '#FFD23F';
const CYAN = '#00F0FF';
const PURPLE = '#D020FF';
const BG_CARD_TRANS = 'rgba(26, 26, 48, 0.95)';
const BORDER_GRAY = '#303040';
const TEXT_WHITE = '#F5F5F5';
const TEXT_MUTED = '#888899';

interface LogoHeaderProps {
  showMenuButton?: boolean;
  menuExpanded?: boolean;
  onMenuPress?: () => void;
  rightContent?: React.ReactNode;
}

export function LogoHeader({
  showMenuButton = false,
  menuExpanded = false,
  onMenuPress,
  rightContent,
}: LogoHeaderProps) {
  return (
    <View className="px-4 pt-3 pb-3">
      <View className="flex-row items-center justify-between">
        {/* Logo - 点击返回首页 */}
        <TouchableOpacity 
          className="flex-row items-center gap-2"
          onPress={() => router.push('/')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#00F0FF', '#BF00FF']}
            className="w-10 h-10 rounded-xl items-center justify-center"
          >
            <Text className="text-lg font-bold text-white">DQ</Text>
          </LinearGradient>
          <Text className="text-xl font-bold" style={{ color: YELLOW }}>
            DeepQuest
          </Text>
        </TouchableOpacity>

        {/* 右侧内容 */}
        <View className="flex-row items-center gap-2">
          {rightContent}
          
          {/* 菜单按钮 */}
          {showMenuButton && (
            <TouchableOpacity
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              onPress={onMenuPress}
            >
              <Ionicons 
                name={menuExpanded ? "close" : "menu"} 
                size={22} 
                color={TEXT_WHITE} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 快捷菜单折叠区域 */}
      {menuExpanded && showMenuButton && (
        <View 
          className="mt-3 rounded-2xl overflow-hidden"
          style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
        >
          <TouchableOpacity
            className="flex-row items-center gap-3 p-4 border-b"
            style={{ borderColor: BORDER_GRAY }}
            onPress={() => { router.push('/profile'); onMenuPress?.(); }}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
              <Ionicons name="person" size={20} color={YELLOW} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>Profile</Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>My Assets</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center gap-3 p-4 border-b"
            style={{ borderColor: BORDER_GRAY }}
            onPress={() => { router.push('/team'); onMenuPress?.(); }}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
              <Ionicons name="people" size={20} color={CYAN} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>Team</Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>Team Rewards</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center gap-3 p-4 border-b"
            style={{ borderColor: BORDER_GRAY }}
            onPress={() => { router.push('/stakes'); onMenuPress?.(); }}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(208,32,255,0.1)' }}>
              <Ionicons name="time" size={20} color={PURPLE} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>Stakes</Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>My Stakes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center gap-3 p-4 border-b"
            style={{ borderColor: BORDER_GRAY }}
            onPress={() => { router.push('/rewards'); onMenuPress?.(); }}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(32,200,80,0.1)' }}>
              <Ionicons name="gift" size={20} color="#20C850" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>Rewards</Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>Claim Rewards</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center gap-3 p-4 border-b"
            style={{ borderColor: BORDER_GRAY }}
            onPress={() => { router.push('/withdrawals'); onMenuPress?.(); }}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,100,50,0.1)' }}>
              <Ionicons name="wallet" size={20} color="#FF6432" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>Withdraw</Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>Records</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center gap-3 p-4"
            onPress={() => { router.push('/nodes'); onMenuPress?.(); }}
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,200,0,0.1)' }}>
              <Ionicons name="diamond" size={20} color="#FFC800" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>Nodes</Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>My Nodes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
