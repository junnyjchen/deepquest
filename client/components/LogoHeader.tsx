import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// 颜色常量
const YELLOW = '#FFD23F';
const BG_CARD_TRANS = 'rgba(26, 26, 48, 0.95)';
const BORDER_GRAY = '#303040';
const TEXT_WHITE = '#F5F5F5';

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
    </View>
  );
}
