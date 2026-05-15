import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'info' | 'warning' | 'danger';
}

const BG_DARK = '#0A0A12';
const BG_CARD = 'rgba(26, 26, 48, 0.95)';
const YELLOW = '#FFD23F';
const CYAN = '#00F0FF';
const RED = '#FF4444';
const TEXT_WHITE = '#F5F5F5';
const TEXT_MUTED = '#A0A0B0';
const BORDER_GRAY = '#303040';

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'info',
}: ConfirmDialogProps) {
  const showCancelButton = Boolean(cancelText?.trim());

  const getTypeColor = () => {
    switch (type) {
      case 'warning': return YELLOW;
      case 'danger': return RED;
      default: return CYAN;
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'warning': return 'warning';
      case 'danger': return 'alert-circle';
      default: return 'information-circle';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* 图标 */}
          <View style={[styles.iconContainer, { backgroundColor: getTypeColor() + '20' }]}>
            <Ionicons name={getTypeIcon() as any} size={48} color={getTypeColor()} />
          </View>

          {/* 标题 */}
          <Text style={styles.title}>{title}</Text>

          {/* 消息内容 */}
          <Text style={styles.message}>{message}</Text>

          {/* 按钮组 */}
          <View style={styles.buttonContainer}>
            {showCancelButton ? (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: getTypeColor() }]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: BG_CARD,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  confirmButton: {
    // backgroundColor set dynamically
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: BG_DARK,
  },
});
