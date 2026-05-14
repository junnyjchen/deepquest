import React from 'react';
import { View, Text } from 'react-native';
import Toast, { ToastConfig } from 'react-native-toast-message';

// 精确匹配 DApp 的颜色体系
const BG_DARK = '#0A0A12';
const BG_CARD_SOLID = '#101018';
const YELLOW = '#FFD23F';
const CYAN = '#00F0FF';
const TEXT_WHITE = '#F5F5F5';
const TEXT_MUTED = '#A0A0B0';

export const toastConfig: ToastConfig = {
  success: (props) => (
    <View
      style={{
        backgroundColor: BG_CARD_SOLID,
        borderRadius: 12,
        padding: 12,
        paddingHorizontal: 16,
        borderLeftWidth: 4,
        borderLeftColor: CYAN,
        maxWidth: 350,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 20 }}>✓</Text>
      <View style={{ flex: 1 }}>
        {props.text1 && (
          <Text style={{ color: TEXT_WHITE, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
            {props.text1}
          </Text>
        )}
        {props.text2 && (
          <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  ),
  error: (props) => (
    <View
      style={{
        backgroundColor: BG_CARD_SOLID,
        borderRadius: 12,
        padding: 12,
        paddingHorizontal: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FF5050',
        maxWidth: 350,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 20 }}>✕</Text>
      <View style={{ flex: 1 }}>
        {props.text1 && (
          <Text style={{ color: TEXT_WHITE, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
            {props.text1}
          </Text>
        )}
        {props.text2 && (
          <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  ),
  info: (props) => (
    <View
      style={{
        backgroundColor: BG_CARD_SOLID,
        borderRadius: 12,
        padding: 12,
        paddingHorizontal: 16,
        borderLeftWidth: 4,
        borderLeftColor: YELLOW,
        maxWidth: 350,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 20 }}>ℹ</Text>
      <View style={{ flex: 1 }}>
        {props.text1 && (
          <Text style={{ color: TEXT_WHITE, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
            {props.text1}
          </Text>
        )}
        {props.text2 && (
          <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  ),
};

// 便捷方法
export const showToast = {
  success: (text1: string, text2?: string) => {
    Toast.show({
      type: 'success',
      text1,
      text2,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60,
    });
  },
  error: (text1: string, text2?: string) => {
    Toast.show({
      type: 'error',
      text1,
      text2,
      position: 'top',
      visibilityTime: 4000,
      topOffset: 60,
    });
  },
  info: (text1: string, text2?: string) => {
    Toast.show({
      type: 'info',
      text1,
      text2,
      position: 'top',
      visibilityTime: 3000,
      topOffset: 60,
    });
  },
};
