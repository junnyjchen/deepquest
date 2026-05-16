import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Linking,
  Modal,
  StyleSheet,
} from 'react-native';
import { Screen } from '@/components/Screen';
import ConfirmDialog from '@/components/ConfirmDialog';
import { LogoHeader } from '@/components/LogoHeader';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappApi } from '@/utils/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { showToast } from '@/utils/toast';
import {
  connectWallet,
  switchToBSC,
  getBrowserProvider,
  getSOLTokenBalance,
  getSOLAllowance,
  approveSOL,
  depositSOLOnChain,
  withdrawLPOnChain,
  getUserLPShares,
  registerUserOnChain,
  isUserRegisteredOnChain,
} from '@/utils/web3';

// 颜色体系（与首页保持一致）
const BG_DARK = '#0A0A12';
const BG_CARD_TRANS = 'rgba(26, 26, 48, 0.95)';
const BG_CARD_SOLID = '#101018';
const YELLOW = '#FFD23F';
const BORDER_GRAY = '#303040';
const TEXT_WHITE = '#F5F5F5';
const TEXT_MUTED = '#A0A0B0';
const CYAN = '#00F0FF';
const PURPLE = '#D020FF';
const GREEN = '#00FF88';
const RED = '#FF5050';

const WALLET_STORAGE_KEY = '@deepquest_wallet';
const REFERRER_STORAGE_KEY = '@deepquest_referrer';
const PENDING_REFERRER_STORAGE_KEY = '@deepquest_pending_referrer';
const ACTIVATION_STORAGE_KEY = '@deepquest_activation';
const MIN_DEPOSIT = '1'; // 最小入金金额

const loadLocalActivation = async (walletAddress: string): Promise<boolean> => {
  try {
    const activationData = await AsyncStorage.getItem(ACTIVATION_STORAGE_KEY);
    if (activationData) {
      const data = JSON.parse(activationData);
      return data.address?.toLowerCase() === walletAddress?.toLowerCase() && data.activated === true;
    }
  } catch (error) {
    console.error('加载激活状态失败:', error);
  }
  return false;
};

const saveLocalActivation = async (walletAddress: string, activated: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      ACTIVATION_STORAGE_KEY,
      JSON.stringify({
        address: walletAddress,
        activated,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error('保存激活状态失败:', error);
  }
};

export default function DappLP() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [solBalance, setSolBalance] = useState('0');
  const [solAllowance, setSolAllowance] = useState('0');
  const [lpShares, setLpShares] = useState('0');
  const [txPending, setTxPending] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');
  const [isOnChainRegistered, setIsOnChainRegistered] = useState(false);
  const [activationModalVisible, setActivationModalVisible] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activationReferrer, setActivationReferrer] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'danger';
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog((prev) => ({
      ...prev,
      visible: false,
      onConfirm: undefined,
    }));
  }, []);

  const openConfirmDialog = useCallback((config: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'danger';
    onConfirm?: () => void;
  }) => {
    setConfirmDialog({
      visible: true,
      title: config.title,
      message: config.message,
      confirmText: config.confirmText,
      cancelText: config.cancelText,
      type: config.type ?? 'info',
      onConfirm: config.onConfirm,
    });
  }, []);

  const toggleMenu = useCallback(() => {
    setMenuVisible((prev) => !prev);
  }, []);

  // 初始化
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          const savedWallet = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
          if (savedWallet) {
            setWalletAddress(savedWallet);
            const localActivated = await loadLocalActivation(savedWallet);
            if (localActivated) {
              setIsOnChainRegistered(true);
            } else {
              const registered = await isUserRegisteredOnChain(savedWallet);
              setIsOnChainRegistered(registered);
              if (registered) {
                await saveLocalActivation(savedWallet, true);
              }
            }
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
      const [balance, allowance, shares] = await Promise.all([
        getSOLTokenBalance(address),
        getSOLAllowance(address),
        getUserLPShares(address),
      ]);
      setSolBalance(balance);
      setSolAllowance(allowance);
      setLpShares(shares);
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  };

  const refreshRegistrationState = useCallback(async (address: string) => {
    try {
      const registered = await isUserRegisteredOnChain(address);
      setIsOnChainRegistered(registered);
      if (registered) {
        await saveLocalActivation(address, true);
      }
      return registered;
    } catch (error) {
      console.error('刷新注册状态失败:', error);
      return false;
    }
  }, []);

  const getStoredReferrer = useCallback(async () => {
    const [pendingReferrer, legacyReferrer] = await Promise.all([
      AsyncStorage.getItem(PENDING_REFERRER_STORAGE_KEY),
      AsyncStorage.getItem(REFERRER_STORAGE_KEY),
    ]);

    return (pendingReferrer || legacyReferrer || '').trim();
  }, []);

  const handleConnect = async () => {
    try {
      const walletInfo = await connectWallet();
      if (!walletInfo) {
        showToast.error(t('common.error'), t('common.walletConnectFailed'));
        return;
      }

      const { address } = walletInfo;
      await switchToBSC();
      await AsyncStorage.setItem(WALLET_STORAGE_KEY, address);
      setWalletAddress(address);

      try {
        const userData = await dappApi.getUserInfo(address);
        if (!userData) {
          const referrer = await getStoredReferrer();
          await dappApi.register(address, referrer, '');
        }
      } catch (error) {
        try {
          const referrer = await getStoredReferrer();
          await dappApi.register(address, referrer, '');
        } catch (registerError) {
          console.log('[LP] 后端注册跳过:', registerError);
        }
      }

      const referrer = await getStoredReferrer();
      if (referrer) {
        setActivationReferrer(referrer);
      }

      await Promise.all([fetchData(address), refreshRegistrationState(address)]);
      showToast.success(
        t('common.success'),
        t('common.walletConnected').replace('{addr}', `${address.slice(0, 10)}...`)
      );
    } catch (error: any) {
      console.error('连接钱包失败:', error);
      showToast.error(t('common.error'), error.message || t('common.walletConnectFailed'));
    }
  };

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    showToast.success(t('common.success'), '钱包地址已复制到剪贴板');
  };

  const handleDisconnect = async () => {
    try {
      await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
    } catch (error) {
      console.error('清理钱包缓存失败:', error);
    }

    setWalletAddress(null);
    setIsOnChainRegistered(false);
    setActivationModalVisible(false);
    setActivationReferrer('');
    setAmount('');
    setSolBalance('0');
    setSolAllowance('0');
    setLpShares('0');
  };

  const handleActivateClick = async () => {
    if (!walletAddress) {
      showToast.info(t('common.tips'), t('common.pleaseConnectWallet'));
      return;
    }

    const referrer = await getStoredReferrer();
    if (referrer) {
      setActivationReferrer(referrer);
    }
    setActivationModalVisible(true);
  };

  const handleActivate = async () => {
    if (!walletAddress) {
      showToast.info(t('common.tips'), t('common.pleaseConnectWallet'));
      return;
    }

    try {
      setActivating(true);

      const alreadyRegistered = await isUserRegisteredOnChain(walletAddress);
      if (alreadyRegistered) {
        setIsOnChainRegistered(true);
        setActivationModalVisible(false);
        await saveLocalActivation(walletAddress, true);
        showToast.info(t('common.tips'), t('index.accountAlreadyActivated'));
        return;
      }

      let referrer = activationReferrer.trim();
      if (!referrer) {
        referrer = await getStoredReferrer();
      }

      if (!referrer) {
        showToast.info(t('common.tips'), t('index.activationNeedReferrer'));
        return;
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(referrer)) {
        showToast.error(t('common.error'), t('index.invalidReferrerAddress'));
        return;
      }

      try {
        await dappApi.bindReferrer(walletAddress, referrer);
      } catch (error) {
        console.log('[LP] 推荐人绑定失败，继续激活:', error);
      }

      const walletInfo = await connectWallet();
      if (!walletInfo) {
        showToast.error(t('common.error'), t('common.walletConnectFailed'));
        return;
      }

      const tx = await registerUserOnChain(walletInfo.signer, referrer);

      openConfirmDialog({
        title: t('index.txSubmittedTitle'),
        message: t('index.activationTxSubmittedMessage'),
        confirmText: t('common.view'),
        cancelText: t('common.confirm'),
        type: 'info',
        onConfirm: () => Linking.openURL(`https://bscscan.com/tx/${tx.hash}`),
      });

      await tx.wait();

      try {
        const result = await dappApi.activate(walletAddress);
        if (result?.is_activated) {
          await saveLocalActivation(walletAddress, true);
        }
      } catch (error) {
        console.log('[LP] 激活同步失败:', error);
      }

      const registered = await refreshRegistrationState(walletAddress);
      if (registered) {
        setActivationModalVisible(false);
        showToast.success(t('common.success'), t('index.accountActivated'));
      }
    } catch (error: any) {
      console.error('激活失败:', error);
      let errorMsg = t('index.activateDefaultError');
      if (error.message && error.message.includes('invalid referrer')) {
        errorMsg = t('index.invalidReferrerNeedNode');
      } else if (error.message) {
        errorMsg = error.message.substring(0, 100);
      }
      showToast.error(t('index.activateFailedTitle'), errorMsg);
    } finally {
      setActivating(false);
    }
  };

  // 处理入金
  const handleAddLP = async () => {
    if (!walletAddress) {
      showToast.info(t('common.tips'), t('common.pleaseConnectWallet'));
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < parseFloat(MIN_DEPOSIT)) {
      const msg = t('lp.alert.minDepositAmount').replace('{amount}', MIN_DEPOSIT);
      openConfirmDialog({
        title: t('lp.alert.minDepositAmount').replace('{amount}', MIN_DEPOSIT),
        message: msg,
        confirmText: t('common.confirm'),
        cancelText: '',
        type: 'warning',
      });
      return;
    }

    if (amountNum > parseFloat(solBalance)) {
      openConfirmDialog({
        title: t('lp.alert.insufficientBalance'),
        message: t('lp.alert.insufficientBalance'),
        confirmText: t('common.confirm'),
        cancelText: '',
        type: 'warning',
      });
      return;
    }

    try {
      const provider = getBrowserProvider();
      if (!provider) {
        openConfirmDialog({
          title: t('lp.alert.needBrowserWallet'),
          message: t('lp.alert.needBrowserWallet'),
          confirmText: t('common.confirm'),
          cancelText: '',
          type: 'warning',
        });
        return;
      }

      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      setTxPending(true);

      // 1. 检查是否已注册，未注册则先链上注册
      let registered = await isUserRegisteredOnChain(userAddress);
      if (!registered) {
        let referrer = activationReferrer.trim();
        if (!referrer) {
          referrer = await getStoredReferrer();
        }

        if (!referrer) {
          showToast.info(t('common.tips'), t('index.activationNeedReferrer'));
          setActivationModalVisible(true);
          return;
        }

        if (!/^0x[a-fA-F0-9]{40}$/.test(referrer)) {
          showToast.error(t('common.error'), t('index.invalidReferrerAddress'));
          setActivationModalVisible(true);
          return;
        }

        try {
          await dappApi.bindReferrer(userAddress, referrer);
        } catch (error) {
          console.log('[LP] 入金前绑定推荐人失败，继续走链上注册:', error);
        }

        console.log('[LP] 用户未注册，先执行链上 register...');
        const registerTx = await registerUserOnChain(signer, referrer);
        await registerTx.wait();
        registered = await refreshRegistrationState(userAddress);

        if (!registered) {
          throw new Error(t('index.activateFailedTitle'));
        }
      }

      // 2. 检查授权额度
      const currentAllowance = await getSOLAllowance(userAddress);

      if (parseFloat(currentAllowance) < amountNum) {
        console.log('[LP] 需要授权 SOL...');
        const approveTx = await approveSOL(signer, amount);
        await approveTx.wait();
        console.log('[LP] 授权成功');
        setSolAllowance(amount);
      }

      // 3. 调用 depositSOL 入金
      console.log('[LP] 开始入金...');
      const addTx = await depositSOLOnChain(signer, amount);
      await addTx.wait();
      console.log('[LP] 入金成功:', addTx.hash);

      openConfirmDialog({
        title: t('lp.alert.addLPSuccess'),
        message: t('lp.alert.addLPSuccess'),
        confirmText: t('common.confirm'),
        cancelText: '',
        type: 'info',
      });
      setAmount('');

      // 刷新数据
      await fetchData(userAddress);

    } catch (error: any) {
      console.error('[LP] 入金失败:', error);
      openConfirmDialog({
        title: t('lp.alert.addLPFailed'),
        message: error?.message || t('lp.alert.addLPFailed'),
        confirmText: t('common.confirm'),
        cancelText: '',
        type: 'danger',
      });
    } finally {
      setTxPending(false);
    }
  };

  // 处理取消 LP
  const handleRemoveLP = async () => {
    if (!walletAddress) {
      openConfirmDialog({
        title: t('lp.alert.connectWallet'),
        message: t('lp.alert.connectWallet'),
        confirmText: t('common.confirm'),
        cancelText: '',
        type: 'warning',
      });
      return;
    }

    if (parseFloat(lpShares) <= 0) {
      openConfirmDialog({
        title: t('lp.alert.noLPToRemove'),
        message: t('lp.alert.noLPToRemove'),
        confirmText: t('common.confirm'),
        cancelText: '',
        type: 'warning',
      });
      return;
    }

    openConfirmDialog({
      title: t('lp.confirmRemoveLP'),
      message: `${t('lp.confirmRemoveLP')} ${parseFloat(lpShares).toFixed(4)} LP`,
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      type: 'warning',
      onConfirm: async () => {
        try {
          const provider = getBrowserProvider();
          if (!provider) {
            openConfirmDialog({
              title: t('lp.alert.needBrowserWallet'),
              message: t('lp.alert.needBrowserWallet'),
              confirmText: t('common.confirm'),
              cancelText: '',
              type: 'warning',
            });
            return;
          }

          const signer = await provider.getSigner();

          setTxPending(true);

          console.log('[LP] 开始取消 LP...');
          const removeTx = await withdrawLPOnChain(signer);
          await removeTx.wait();
          console.log('[LP] 取消 LP 成功:', removeTx.hash);

          openConfirmDialog({
            title: t('lp.alert.removeLPSuccess'),
            message: t('lp.alert.removeLPSuccess'),
            confirmText: t('common.confirm'),
            cancelText: '',
            type: 'info',
          });

          // 刷新数据
          await fetchData(await signer.getAddress());

        } catch (error: any) {
          console.error('[LP] 取消 LP 失败:', error);
          openConfirmDialog({
            title: t('lp.alert.removeLPFailed'),
            message: error?.message || t('lp.alert.removeLPFailed'),
            confirmText: t('common.confirm'),
            cancelText: '',
            type: 'danger',
          });
        } finally {
          setTxPending(false);
        }
      },
    });
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
        <LogoHeader showMenuButton={true} menuExpanded={menuVisible} onMenuPress={toggleMenu} />
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
      <LogoHeader showMenuButton={true} menuExpanded={menuVisible} onMenuPress={toggleMenu} />
      <View className="px-4 pb-2">
        <View className="flex-row items-center gap-2 flex-wrap">
          {walletAddress ? (
            <>
              <TouchableOpacity
                className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
                onPress={handleCopyAddress}
              >
                <Ionicons name="folder-open" size={14} color={TEXT_WHITE} />
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </Text>
              </TouchableOpacity>

              {!isOnChainRegistered && (
                <TouchableOpacity
                  className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,210,63,0.2)', borderWidth: 1, borderColor: YELLOW }}
                  onPress={handleActivateClick}
                >
                  <Ionicons name="warning" size={14} color={YELLOW} />
                  <Text className="text-sm" style={{ color: YELLOW }}>激活</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                className="px-2.5 py-1.5 rounded-lg"
                style={{ backgroundColor: 'rgba(255,80,80,0.2)', borderWidth: 1, borderColor: '#FF5050' }}
                onPress={handleDisconnect}
              >
                <Text className="text-sm" style={{ color: '#FF5050' }}>{t('home.disconnect')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              className="px-2.5 py-1.5 rounded-lg"
              style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: BORDER_GRAY }}
              onPress={handleConnect}
            >
              <Text className="text-sm" style={{ color: TEXT_WHITE }}>{t('home.connectWallet')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 快捷菜单折叠区域 */}
      {menuVisible && (
        <View className="px-4 pb-3">
          <View 
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
          >
            <TouchableOpacity
              className="flex-row items-center gap-3 p-4 border-b"
              style={{ borderColor: BORDER_GRAY }}
              onPress={() => { router.push('/profile'); setMenuVisible(false); }}
            >
              <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
                <Ionicons name="person" size={20} color={YELLOW} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.title')}</Text>
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('profile.myAssets')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center gap-3 p-4 border-b"
              style={{ borderColor: BORDER_GRAY }}
              onPress={() => { router.push('/team'); setMenuVisible(false); }}
            >
              <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
                <Ionicons name="people" size={20} color={CYAN} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('team.title')}</Text>
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('team.teamRewards')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center gap-3 p-4 border-b"
              style={{ borderColor: BORDER_GRAY }}
              onPress={() => { router.push('/rewards'); setMenuVisible(false); }}
            >
              <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(255,215,0,0.1)' }}>
                <Ionicons name="gift" size={20} color={YELLOW} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.rewards')}</Text>
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('rewards.title')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center gap-3 p-4 border-b"
              style={{ borderColor: BORDER_GRAY }}
              onPress={() => { router.push('/withdrawals'); setMenuVisible(false); }}
            >
              <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
                <Ionicons name="wallet-outline" size={20} color={CYAN} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.withdrawals')}</Text>
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('withdrawals.title')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center gap-3 p-4 border-b"
              style={{ borderColor: BORDER_GRAY }}
              onPress={() => { router.push('/nodes'); setMenuVisible(false); }}
            >
              <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(208,32,255,0.1)' }}>
                <Ionicons name="ribbon" size={20} color={PURPLE} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.nodes')}</Text>
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('nodes.subtitle')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center gap-3 p-4 border-b"
              style={{ borderColor: BORDER_GRAY }}
              onPress={() => { router.push('/lp'); setMenuVisible(false); }}
            >
              <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(0,240,255,0.1)' }}>
                <Ionicons name="swap-horizontal" size={20} color={CYAN} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('lp.addLP')}</Text>
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('lp.subtitle')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center gap-3 p-4"
              onPress={() => { router.push('/stakes'); setMenuVisible(false); }}
            >
              <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: 'rgba(208,32,255,0.1)' }}>
                <Ionicons name="time" size={20} color={PURPLE} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>{t('profile.stakes')}</Text>
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>{t('stakes.title')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView className="flex-1 px-4 pt-2">
        {/* Tab 切换 */}
        <View className="flex-row mb-4 rounded-xl overflow-hidden" style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}>
          <TouchableOpacity
            className="flex-1 py-3 items-center"
            style={{ backgroundColor: activeTab === 'add' ? CYAN : 'transparent' }}
            onPress={() => setActiveTab('add')}
          >
            <Text className="text-sm font-medium" style={{ color: activeTab === 'add' ? BG_DARK : TEXT_MUTED }}>
              {t('lp.addLP')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-3 items-center"
            style={{ backgroundColor: activeTab === 'remove' ? RED : 'transparent' }}
            onPress={() => setActiveTab('remove')}
          >
            <Text className="text-sm font-medium" style={{ color: activeTab === 'remove' ? TEXT_WHITE : TEXT_MUTED }}>
              {t('lp.removeLP')}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'add' ? (
          <View className="gap-3">

            {/* 入金输入区卡片 */}
            <View 
              className="rounded-2xl p-4"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: CYAN }}>
                    <Ionicons name="diamond" size={16} color={BG_DARK} />
                  </View>
                  <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>SOL</Text>
                </View>
                <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                  {t('lp.solBalance')}: {parseFloat(solBalance).toFixed(4)}
                </Text>
              </View>

              <TextInput
                className="text-xl font-semibold mb-3"
                style={{ color: TEXT_WHITE, backgroundColor: 'transparent' }}
                placeholder="0.00"
                placeholderTextColor={TEXT_MUTED}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />

              {/* 快捷按钮 */}
              <View className="flex-row gap-2 mb-3">
                {[0.25, 0.5, 0.75, 1].map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    className="flex-1 py-2.5 rounded-lg items-center"
                    style={{
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: BORDER_GRAY,
                    }}
                    onPress={() => setQuickAmount(pct)}
                  >
                    <Text className="text-sm font-medium" style={{ color: TEXT_WHITE }}>
                      {pct * 100}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 入金说明卡片 */}
            <View 
              className="rounded-2xl p-4"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
            >
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
                <Text className="text-base font-semibold" style={{ color: BG_DARK }}>
                  {t('lp.confirmAddLP')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3">
            {/* 取消 LP 说明卡片 */}
            <View 
              className="rounded-2xl p-4"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: YELLOW }}
            >
              <View className="flex-row items-center mb-3">
                <Ionicons name="warning" size={18} color={YELLOW} />
                <Text className="ml-2 text-sm font-medium" style={{ color: YELLOW }}>
                  {t('lp.removeLPTip')}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>
                  {t('lp.myLPShares')}: 
                </Text>
                <Text className="text-sm font-bold ml-2" style={{ color: PURPLE }}>
                  {parseFloat(lpShares).toFixed(4)} LP
                </Text>
              </View>
            </View>

            {/* 取消 LP 按钮 */}
            <TouchableOpacity
              className="py-4 rounded-xl items-center"
              style={{ backgroundColor: txPending || parseFloat(lpShares) <= 0 ? TEXT_MUTED : RED }}
              onPress={handleRemoveLP}
              disabled={txPending || parseFloat(lpShares) <= 0}
            >
              {txPending ? (
                <ActivityIndicator color={TEXT_WHITE} />
              ) : (
                <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>
                  {t('lp.confirmRemoveLP')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 未连接钱包提示 */}
        {!walletAddress && (
          <View className="mt-4 p-6 rounded-2xl items-center" style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}>
            <Ionicons name="wallet-outline" size={40} color={TEXT_MUTED} />
            <Text className="mt-3 text-sm" style={{ color: TEXT_MUTED }}>
              {t('lp.connectWalletFirst')}
            </Text>
          </View>
        )}

        <View className="pb-8" />
      </ScrollView>

      <Modal
        visible={activationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActivationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.activationModalContent}>
            <View style={styles.activationModalHeader}>
              <Ionicons name="warning" size={48} color={YELLOW} />
              <Text style={styles.activationModalTitle}>激活账户</Text>
            </View>

            <Text style={styles.activationModalDesc}>
              当前钱包尚未完成链上注册，激活后才可进行 LP 入金与相关操作。
            </Text>

            <View style={styles.activationInfoBox}>
              <Text style={styles.activationInfoLabel}>激活说明:</Text>
              <Text style={styles.activationInfoText}>1. 需要填写有效的节点推荐人地址</Text>
              <Text style={styles.activationInfoText}>2. 点击下方「立即激活」发起链上注册</Text>
              <Text style={styles.activationInfoText}>3. 在钱包中确认交易并等待链上确认</Text>
            </View>

            <View style={styles.referrerInputBox}>
              <Text style={styles.referrerInputLabel}>节点推荐人地址:</Text>
              <TextInput
                style={styles.referrerInput}
                value={activationReferrer}
                onChangeText={setActivationReferrer}
                placeholder="0x..."
                placeholderTextColor={TEXT_MUTED}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.activationModalButtons}>
              <TouchableOpacity
                style={[styles.activationModalBtn, styles.skipBtn]}
                onPress={() => setActivationModalVisible(false)}
              >
                <Text style={styles.skipBtnText}>稍后激活</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.activationModalBtn, styles.activateBtn]}
                onPress={handleActivate}
                disabled={activating}
              >
                {activating ? (
                  <ActivityIndicator size="small" color={BG_DARK} />
                ) : (
                  <Text style={styles.activateBtnText}>立即激活</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        onCancel={closeConfirmDialog}
        onConfirm={() => {
          const handler = confirmDialog.onConfirm;
          closeConfirmDialog();
          handler?.();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  activationModalContent: {
    backgroundColor: BG_CARD_SOLID,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: YELLOW,
  },
  activationModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  activationModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginTop: 12,
  },
  activationModalDesc: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  activationInfoBox: {
    backgroundColor: BG_DARK,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  activationInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: YELLOW,
    marginBottom: 8,
  },
  activationInfoText: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 20,
  },
  referrerInputBox: {
    marginBottom: 16,
  },
  referrerInputLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 6,
  },
  referrerInput: {
    backgroundColor: BG_DARK,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: CYAN,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  activationModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  activationModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  skipBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BORDER_GRAY,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  activateBtn: {
    backgroundColor: YELLOW,
  },
  activateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BG_DARK,
  },
});
