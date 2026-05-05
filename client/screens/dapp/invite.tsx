import { useState, useEffect } from 'react';
import QuickMenu from '@/components/QuickMenu';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Screen } from '@/components/Screen';

import { useSafeSearchParams, useSafeRouter } from '@/hooks/useSafeRouter';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappApi } from '@/utils/api';
import { useLanguage } from '@/contexts/LanguageContext';

// 颜色体系
const BG_DARK = '#0A0A12';
const BG_CARD = 'rgba(26, 26, 48, 0.95)';
const YELLOW = '#FFD23F';
const CYAN = '#00F0FF';
const PURPLE = '#D020FF';
const GREEN = '#00FF88';
const RED = '#FF4444';
const TEXT_WHITE = '#F5F5F5';
const TEXT_MUTED = '#A0A0B0';
const BORDER_GRAY = '#303040';

const WALLET_STORAGE_KEY = '@deepquest_wallet';

export default function InviteBinding() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ ref?: string }>();
  const { t } = useLanguage();
  
  const referrerAddress = params.ref || '';
  
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [referrerValid, setReferrerValid] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<{
    wallet_address: string;
    level: number;
    created_at: string;
  } | null>(null);
  const [alreadyBound, setAlreadyBound] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    initPage();
  }, []);

  const initPage = async () => {
    try {
      // 获取钱包地址
      const savedWallet = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
      
      // 如果没有钱包地址，先跳转连接钱包
      if (!savedWallet) {
        // 保存推荐人地址到本地，等连接钱包后再绑定
        if (referrerAddress) {
          await AsyncStorage.setItem('@deepquest_pending_referrer', referrerAddress);
        }
        Alert.alert(
          '提示',
          '请先连接钱包后再绑定推荐人',
          [
            {
              text: '确定',
              onPress: () => router.back(),
            },
          ]
        );
        setLoading(false);
        setValidating(false);
        return;
      }
      
      setWalletAddress(savedWallet);
      
      // 检查是否已绑定推荐人
      const bindingResult = await dappApi.checkBinding(savedWallet);
      if (bindingResult.bound) {
        setAlreadyBound(true);
        setLoading(false);
        setValidating(false);
        return;
      }
      
      // 如果有推荐人地址，验证它
      if (referrerAddress) {
        await validateReferrer();
      } else {
        setErrorMessage('无效的邀请链接');
        setValidating(false);
      }
    } catch (error: any) {
      console.error('初始化失败:', error);
      setErrorMessage(error.message || '初始化失败');
    } finally {
      setLoading(false);
      setValidating(false);
    }
  };

  const validateReferrer = async () => {
    if (!referrerAddress) {
      setErrorMessage('无效的邀请链接');
      return;
    }

    try {
      setValidating(true);
      const result = await dappApi.validateReferrer(referrerAddress);
      
      if (result.valid && result.data) {
        setReferrerValid(true);
        setReferrerInfo(result.data);
      } else {
        setReferrerValid(false);
        setErrorMessage('推荐人不存在');
      }
    } catch (error: any) {
      console.error('验证推荐人失败:', error);
      setReferrerValid(false);
      setErrorMessage(error.message || '验证推荐人失败');
    } finally {
      setValidating(false);
    }
  };

  const handleBindReferrer = async () => {
    if (!walletAddress || !referrerAddress) {
      Alert.alert('错误', '缺少必要信息');
      return;
    }

    try {
      setSubmitting(true);
      
      // 调用后端API绑定推荐人
      // 注意：实际生产环境中，这里需要调用合约
      const result = await dappApi.bindReferrer(walletAddress, referrerAddress);
      
      if (result.code === 0) {
        Alert.alert(
          '绑定成功',
          '您已成功绑定推荐关系！',
          [
            {
              text: '返回首页',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('绑定失败', result.message || '绑定推荐人失败');
      }
    } catch (error: any) {
      console.error('绑定失败:', error);
      Alert.alert('绑定失败', error.message || '绑定推荐人失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoHome = () => {
    router.back();
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={YELLOW} />
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <QuickMenu />
      <View style={styles.container}>
        {/* 内容区域 */}
        <View style={styles.content}>
          {/* 邀请图标 */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons 
                name={referrerValid ? "checkmark-circle" : "people"} 
                size={64} 
                color={referrerValid ? GREEN : YELLOW} 
              />
            </View>
          </View>

          {/* 状态标题 */}
          {alreadyBound ? (
            <View style={styles.statusContainer}>
              <Text style={styles.statusTitle}>已绑定推荐人</Text>
              <Text style={styles.statusSubtitle}>您已经绑定了推荐关系</Text>
            </View>
          ) : validating ? (
            <View style={styles.statusContainer}>
              <Text style={styles.statusTitle}>验证中...</Text>
              <Text style={styles.statusSubtitle}>正在验证推荐人信息</Text>
              <ActivityIndicator size="small" color={CYAN} style={{ marginTop: 16 }} />
            </View>
          ) : referrerValid ? (
            <View style={styles.statusContainer}>
              <Text style={styles.statusTitle}>确认绑定推荐人</Text>
              <Text style={styles.statusSubtitle}>您正在绑定以下用户为推荐人</Text>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <Text style={[styles.statusTitle, { color: RED }]}>邀请无效</Text>
              <Text style={styles.statusSubtitle}>{errorMessage || '该邀请链接无效'}</Text>
            </View>
          )}

          {/* 推荐人信息卡片 */}
          {referrerValid && referrerInfo && !alreadyBound && (
            <View style={styles.referrerCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.levelBadge, { backgroundColor: `${YELLOW}20` }]}>
                  <Text style={[styles.levelText, { color: YELLOW }]}>Lv.{referrerInfo.level}</Text>
                </View>
                <Text style={styles.cardLabel}>推荐人</Text>
              </View>
              
              <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
                {referrerInfo.wallet_address}
              </Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>绑定时间：</Text>
                <Text style={styles.infoValue}>即刻</Text>
              </View>
            </View>
          )}

          {/* 警告提示 */}
          {referrerValid && !alreadyBound && (
            <View style={styles.warningContainer}>
              <Ionicons name="information-circle" size={20} color={CYAN} />
              <Text style={styles.warningText}>
                绑定推荐人后无法更改，请确认信息无误后点击下方按钮授权绑定。
              </Text>
            </View>
          )}

          {/* 操作按钮 */}
          {alreadyBound ? (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: BG_CARD }]}
              onPress={handleGoHome}
            >
              <Text style={styles.actionButtonText}>返回首页</Text>
            </TouchableOpacity>
          ) : !referrerValid ? (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: BORDER_GRAY }]}
              onPress={handleGoHome}
            >
              <Text style={[styles.actionButtonText, { color: TEXT_MUTED }]}>返回首页</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: GREEN }]}
              onPress={handleBindReferrer}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={BG_DARK} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={BG_DARK} />
                  <Text style={[styles.actionButtonText, { color: BG_DARK }]}>
                    确认授权绑定
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* 钱包信息 */}
          {walletAddress && (
            <View style={styles.walletInfo}>
              <Text style={styles.walletLabel}>当前钱包：</Text>
              <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                {walletAddress}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_DARK,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: TEXT_WHITE,
    marginTop: 16,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BG_CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_WHITE,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${BG_CARD}`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: BORDER_GRAY,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  referrerCard: {
    width: '100%',
    backgroundColor: BG_CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: YELLOW,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardLabel: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  addressText: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: CYAN,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  infoValue: {
    fontSize: 12,
    color: TEXT_WHITE,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${CYAN}15`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: CYAN,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_WHITE,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  walletLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  walletAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: TEXT_MUTED,
    maxWidth: 200,
  },
});
