import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { LogoHeader } from '@/components/LogoHeader';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappApi } from '@/utils/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { getBrowserProvider } from '@/utils/web3';
import { ethers } from 'ethers';
import {
  getSOLTokenBalance,
  getSOLAllowance,
  approveSOL,
  addLiquidityOnChain,
  withdrawLPOnChain,
  getUserLPShares,
  registerUserOnChain,
  isUserRegisteredOnChain,
} from '@/utils/web3';

// 颜色体系
const BG_DARK = '#0A0A12';
const BG_CARD = '#101018';
const BG_INPUT = '#1A1A2E';
const CYAN = '#00F0FF';
const PURPLE = '#D020FF';
const YELLOW = '#FFD23F';
const GREEN = '#00FF88';
const RED = '#FF4444';
const TEXT_WHITE = '#F5F5F5';
const TEXT_MUTED = '#A0A0B0';
const BORDER_GRAY = '#303040';

const WALLET_STORAGE_KEY = '@deepquest_wallet';
const REFERRER_STORAGE_KEY = '@deepquest_referrer';
const MIN_DEPOSIT = '1'; // 最小入金金额

export default function DappLP() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [solBalance, setSolBalance] = useState('0');
  const [solAllowance, setSolAllowance] = useState('0');
  const [lpShares, setLpShares] = useState('0');
  const [txPending, setTxPending] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');

  // 初始化
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          const savedWallet = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
          if (savedWallet) {
            setWalletAddress(savedWallet);
            await fetchData(savedWallet);
          }
        } catch (error) {
          console.error('初始化失败:', error);
        } finally {
          setLoading(false);
        }
      };
      
      init();
    }, [])
  );

  const fetchData = async (address: string) => {
    try {
      // 获取 SOL 余额
      const balance = await getSOLTokenBalance(address);
      setSolBalance(balance);

      // 获取 SOL 授权额度
      const allowance = await getSOLAllowance(address);
      setSolAllowance(allowance);

      // 获取 LP 份额
      const shares = await getUserLPShares(address);
      setLpShares(shares);
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  };

  // 处理入金（添加 LP）
  const handleAddLP = async () => {
    if (!walletAddress) {
      Alert.alert(t('lp.alert.connectWallet'), t('lp.alert.connectWallet'));
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < parseFloat(MIN_DEPOSIT)) {
      const msg = t('lp.alert.minDepositAmount').replace('{amount}', MIN_DEPOSIT);
      Alert.alert(t('lp.alert.minDepositAmount').replace('{amount}', MIN_DEPOSIT), msg);
      return;
    }

    if (amountNum > parseFloat(solBalance)) {
      Alert.alert(t('lp.alert.insufficientBalance'), t('lp.alert.insufficientBalance'));
      return;
    }

    try {
      const provider = getBrowserProvider();
      if (!provider) {
        Alert.alert(t('lp.alert.needBrowserWallet'), t('lp.alert.needBrowserWallet'));
        return;
      }

      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      setTxPending(true);

      // 1. 检查是否已注册
      const isRegistered = await isUserRegisteredOnChain(userAddress);
      if (!isRegistered) {
        // 获取推荐人地址
        const referrer = await AsyncStorage.getItem(REFERRER_STORAGE_KEY);
        if (!referrer) {
          Alert.alert(t('lp.alert.referrerNotFound'), t('lp.alert.referrerNotFound'));
          setTxPending(false);
          return;
        }

        console.log('[LP] 用户未注册，先注册...');
        const registerTx = await registerUserOnChain(signer, referrer);
        await registerTx.wait();
        console.log('[LP] 注册成功');
      }

      // 2. 检查授权额度
      const currentAllowance = await getSOLAllowance(userAddress);
      const amountInWei = ethers.parseUnits(amount, 18);

      if (parseFloat(currentAllowance) < amountNum) {
        console.log('[LP] 需要授权 SOL...');
        const approveTx = await approveSOL(signer, amount);
        await approveTx.wait();
        console.log('[LP] 授权成功');
        setSolAllowance(amount);
      }

      // 3. 调用 addLiquidityForUser 入金
      console.log('[LP] 开始入金...');
      const addTx = await addLiquidityOnChain(signer, amount, '0');
      await addTx.wait();
      console.log('[LP] 入金成功:', addTx.hash);

      Alert.alert(t('lp.alert.addLPSuccess'), t('lp.alert.addLPSuccess'));
      setAmount('');

      // 刷新数据
      await fetchData(userAddress);

    } catch (error: any) {
      console.error('[LP] 入金失败:', error);
      Alert.alert(t('lp.alert.addLPFailed'), error?.message || t('lp.alert.addLPFailed'));
    } finally {
      setTxPending(false);
    }
  };

  // 处理取消 LP
  const handleRemoveLP = async () => {
    if (!walletAddress) {
      Alert.alert(t('lp.alert.connectWallet'), t('lp.alert.connectWallet'));
      return;
    }

    if (parseFloat(lpShares) <= 0) {
      Alert.alert(t('lp.alert.noLPToRemove'), t('lp.alert.noLPToRemove'));
      return;
    }

    Alert.alert(
      t('lp.confirmRemoveLP'),
      `${t('lp.confirmRemoveLP')} ${parseFloat(lpShares).toFixed(4)} LP`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              const provider = getBrowserProvider();
              if (!provider) {
                Alert.alert(t('lp.alert.needBrowserWallet'), t('lp.alert.needBrowserWallet'));
                return;
              }

              const signer = await provider.getSigner();

              setTxPending(true);

              console.log('[LP] 开始取消 LP...');
              const removeTx = await withdrawLPOnChain(signer);
              await removeTx.wait();
              console.log('[LP] 取消 LP 成功:', removeTx.hash);

              Alert.alert(t('lp.alert.removeLPSuccess'), t('lp.alert.removeLPSuccess'));

              // 刷新数据
              await fetchData(await signer.getAddress());

            } catch (error: any) {
              console.error('[LP] 取消 LP 失败:', error);
              Alert.alert(t('lp.alert.removeLPFailed'), error?.message || t('lp.alert.removeLPFailed'));
            } finally {
              setTxPending(false);
            }
          },
        },
      ]
    );
  };

  // 设置快捷金额
  const setQuickAmount = (percentage: number) => {
    const available = parseFloat(solBalance);
    const quickAmount = (available * percentage).toFixed(4);
    setAmount(quickAmount);
  };

  if (loading) {
    return (
      <Screen>
        <LogoHeader />
        <View className="px-4 pt-2 pb-3">
          <Text className="text-xl font-bold" style={{ color: TEXT_WHITE }}>{t('lp.title')}</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={CYAN} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <LogoHeader />
      <View className="px-4 pt-2 pb-3">
        <Text className="text-xl font-bold" style={{ color: TEXT_WHITE }}>{t('lp.title')}</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {/* Tab 切换 */}
        <View className="flex-row mb-6 rounded-xl overflow-hidden" style={{ backgroundColor: BG_CARD }}>
          <TouchableOpacity
            className="flex-1 py-3 items-center"
            style={{ backgroundColor: activeTab === 'add' ? CYAN : 'transparent' }}
            onPress={() => setActiveTab('add')}
          >
            <Text
              className="font-semibold"
              style={{ color: activeTab === 'add' ? BG_DARK : TEXT_MUTED }}
            >
              {t('lp.addLP')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-3 items-center"
            style={{ backgroundColor: activeTab === 'remove' ? RED : 'transparent' }}
            onPress={() => setActiveTab('remove')}
          >
            <Text
              className="font-semibold"
              style={{ color: activeTab === 'remove' ? TEXT_WHITE : TEXT_MUTED }}
            >
              {t('lp.removeLP')}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'add' ? (
          <>
            {/* SOL 余额卡片 */}
            <View className="p-4 rounded-xl mb-4" style={{ backgroundColor: BG_CARD }}>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                  {t('lp.solBalance')}
                </Text>
                <Text className="text-lg font-bold" style={{ color: YELLOW }}>
                  {parseFloat(solBalance).toFixed(4)} SOL
                </Text>
              </View>
            </View>

            {/* 入金输入区 */}
            <View className="p-4 rounded-xl mb-4" style={{ backgroundColor: BG_CARD }}>
              <Text className="text-sm mb-2" style={{ color: TEXT_MUTED }}>
                {t('lp.depositAmount')}
              </Text>
              <View className="flex-row items-center mb-3">
                <TextInput
                  className="flex-1 text-2xl font-bold"
                  style={{ color: TEXT_WHITE, backgroundColor: BG_INPUT, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 }}
                  placeholder="0.00"
                  placeholderTextColor={TEXT_MUTED}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
                <Text className="ml-3 text-lg font-bold" style={{ color: CYAN }}>
                  SOL
                </Text>
              </View>

              {/* 快捷按钮 */}
              <View className="flex-row gap-2">
                {[0.25, 0.5, 0.75, 1].map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    className="flex-1 py-2 rounded-lg items-center"
                    style={{ backgroundColor: BG_INPUT }}
                    onPress={() => setQuickAmount(pct)}
                  >
                    <Text className="text-xs" style={{ color: TEXT_MUTED }}>
                      {pct * 100}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-xs mt-3" style={{ color: TEXT_MUTED }}>
                {t('lp.minDeposit')}: {MIN_DEPOSIT} SOL
              </Text>
            </View>

            {/* 入金说明 */}
            <View className="p-4 rounded-xl mb-4" style={{ backgroundColor: BG_CARD }}>
              <View className="flex-row items-start mb-2">
                <Ionicons name="information-circle" size={16} color={CYAN} />
                <Text className="ml-2 text-xs flex-1" style={{ color: TEXT_MUTED }}>
                  {t('lp.addLPTip')}
                </Text>
              </View>
              <View className="flex-row items-start mb-2">
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text className="ml-2 text-xs flex-1" style={{ color: TEXT_MUTED }}>
                  {t('lp.addLPBenefit1')}
                </Text>
              </View>
              <View className="flex-row items-start">
                <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                <Text className="ml-2 text-xs flex-1" style={{ color: TEXT_MUTED }}>
                  {t('lp.addLPBenefit2')}
                </Text>
              </View>
            </View>

            {/* 入金按钮 */}
            <TouchableOpacity
              className="py-4 rounded-xl items-center"
              style={{ backgroundColor: txPending ? TEXT_MUTED : CYAN }}
              onPress={handleAddLP}
              disabled={txPending || !amount}
            >
              {txPending ? (
                <ActivityIndicator color={BG_DARK} />
              ) : (
                <Text className="text-lg font-bold" style={{ color: BG_DARK }}>
                  {t('lp.confirmAddLP')}
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* LP 份额卡片 */}
            <View className="p-4 rounded-xl mb-4" style={{ backgroundColor: BG_CARD }}>
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                  {t('lp.myLPShares')}
                </Text>
                <Ionicons name="ribbon" size={20} color={PURPLE} />
              </View>
              <Text className="text-3xl font-bold mb-1" style={{ color: PURPLE }}>
                {parseFloat(lpShares).toFixed(4)} LP
              </Text>
              <Text className="text-xs" style={{ color: TEXT_MUTED }}>
                {t('lp.lpValue')}
              </Text>
            </View>

            {/* 取消 LP 说明 */}
            <View className="p-4 rounded-xl mb-4" style={{ backgroundColor: BG_CARD }}>
              <View className="flex-row items-start mb-2">
                <Ionicons name="warning" size={16} color={YELLOW} />
                <Text className="ml-2 text-xs flex-1" style={{ color: TEXT_MUTED }}>
                  {t('lp.removeLPTip')}
                </Text>
              </View>
            </View>

            {/* 取消 LP 按钮 */}
            <TouchableOpacity
              className="py-4 rounded-xl items-center"
              style={{ backgroundColor: txPending ? TEXT_MUTED : RED }}
              onPress={handleRemoveLP}
              disabled={txPending || parseFloat(lpShares) <= 0}
            >
              {txPending ? (
                <ActivityIndicator color={TEXT_WHITE} />
              ) : (
                <Text className="text-lg font-bold" style={{ color: TEXT_WHITE }}>
                  {t('lp.confirmRemoveLP')}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* 未连接钱包提示 */}
        {!walletAddress && (
          <View className="mt-6 p-4 rounded-xl items-center" style={{ backgroundColor: BG_CARD }}>
            <Ionicons name="wallet-outline" size={32} color={TEXT_MUTED} />
            <Text className="mt-2 text-sm" style={{ color: TEXT_MUTED }}>
              {t('lp.connectWalletFirst')}
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
