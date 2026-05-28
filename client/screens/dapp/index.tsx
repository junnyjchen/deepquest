import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Screen } from '@/components/Screen';
import { LogoHeader } from '@/components/LogoHeader';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dappApi , dappUserApi } from '@/utils/api';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  connectWallet,
  switchToBSC,
  isUserRegisteredOnChain,
  registerUserOnChain,
  getBNBBalance,
  getSOLTokenBalance,
  getDQTokenBalance,
  sellDQForSOL,
  approveDQToken,
  checkDQAllowance,
  depositSOLOnChain,
  stakeDQOnChain,
} from '@/utils/web3';
import { CONTRACT_ADDRESSES } from '@/config/contracts';

// 用户信息类型
interface UserInfo {
  wallet_address: string;
  referrer_address?: string;
  level?: number;
  directCount?: number;
  totalInvest?: string;
  teamInvest?: string;
  directSales?: string;
}

interface DialogState {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'info' | 'warning' | 'danger';
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}

// 精确匹配参考图的颜色体系
const BG_DARK = '#0A0A12';
const BG_CARD_TRANS = 'rgba(26, 26, 48, 0.95)';
const BG_CARD_SOLID = '#101018';
const YELLOW = '#FFD23F';
const BORDER_GRAY = '#303040';
const TEXT_WHITE = '#F5F5F5';
const TEXT_MUTED = '#A0A0B0';
const CYAN = '#00F0FF';
const PURPLE = '#D020FF';

const WALLET_STORAGE_KEY = '@deepquest_wallet';
const ACTIVATION_STORAGE_KEY = '@deepquest_activation';

// 加载本地激活状态
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

// 保存本地激活状态
const saveLocalActivation = async (walletAddress: string, activated: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(ACTIVATION_STORAGE_KEY, JSON.stringify({
      address: walletAddress,
      activated: activated,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('保存激活状态失败:', error);
  }
};

export default function DappIndex() {
  const router = useSafeRouter();
  const { t, language, setLanguage, languages } = useLanguage();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'swap' | 'stake'>('swap');

  const [menuExpanded, setMenuExpanded] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakePeriod, setStakePeriod] = useState<30 | 90 | 180 | 360>(30);
  const [bnbBalance, setBnbBalance] = useState('0.0');
  const [dqtBalance, setDqtBalance] = useState('0.0');
  const [solBalance, setSolBalance] = useState('0.00');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // 邀请绑定相关状态
  const [pendingInviteReferrer, setPendingInviteReferrer] = useState<string | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({
    visible: false,
    title: '',
    message: '',
    confirmText: t('common.confirm'),
    cancelText: '',
    type: 'info',
  });

  // 质押周期配置
  const stakePeriods = [
    { days: 30, label: `${30}${t('common.daysUnit')}`, reward: '5%' },
    { days: 90, label: `${90}${t('common.daysUnit')}`, reward: '10%' },
    { days: 180, label: `${180}${t('common.daysUnit')}`, reward: '15%' },
    { days: 360, label: `${360}${t('common.daysUnit')}`, reward: '20%' },
  ] as const;

  // 激活相关状态
  const [isOnChainRegistered, setIsOnChainRegistered] = useState(false);
  const [activationModalVisible, setActivationModalVisible] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activationReferrer, setActivationReferrer] = useState('');

  // SOL 代币颜色
  const SOL_PURPLE = '#9945FF';

  // 平台数据
  const [stats, setStats] = useState({
    totalSupply: '330,000,000',
    totalBurned: '140,480,617',
    todayDeposit: '0.00',
    networkPower: '63,497,422',
    solPoolBalance: '0.00',
    dqtPoolBalance: '0.00',
    totalUsers: 0,
    totalDeposit: '0.00',
    totalReward: 0,
    dqtPrice: '0.15224',
  });

  const closeDialog = () => {
    setDialogState((prev) => ({
      ...prev,
      visible: false,
    }));
  };

  const openDialog = (config: Omit<DialogState, 'visible'>) => {
    setDialogState({
      visible: true,
      ...config,
    });
  };

  const openTxDialog = (title: string, message: string, txHash: string) => {
    openDialog({
      title,
      message,
      confirmText: t('common.view'),
      cancelText: t('common.confirm'),
      type: 'info',
      onConfirm: () => Linking.openURL(`https://bscscan.com/tx/${txHash}`),
      onCancel: () => undefined,
    });
  };

  const handleDialogConfirm = async () => {
    const action = dialogState.onConfirm;
    closeDialog();
    if (action) {
      await action();
    }
  };

  const handleDialogCancel = async () => {
    const action = dialogState.onCancel;
    closeDialog();
    if (action) {
      await action();
    }
  };

  const fetchChainBalances = useCallback(async (address: string) => {
    try {
      setLoading(true);
      const [solBalance, dqtBalance] = await Promise.all([
        getSOLTokenBalance(address),
        getDQTokenBalance(address),
      ]);
      setSolBalance(parseFloat(solBalance).toFixed(4));
      setDqtBalance(parseFloat(dqtBalance).toFixed(2));
    } catch (error) {
      console.error('获取链上余额失败:', error);
    } finally {
      setLoading(false);
    }  
  }, []);

  // 加载保存的钱包地址
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          // 加载保存的钱包地址
          const savedWallet = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
          if (savedWallet) {
            setWalletAddress(savedWallet);
            // 加载本地激活状态
            const localActivated = await loadLocalActivation(savedWallet);
            if (localActivated) {
              setIsOnChainRegistered(true);
            }
            // 检查是否已绑定推荐人
            await checkInviteBinding(savedWallet);
          }
          
          // 获取平台统计数据
          await fetchStats();

          //获取用户余额信息 DQ ,SOL
          if (savedWallet) {
            await fetchChainBalances(savedWallet);
          }
        } catch (error) {
          console.error('初始化失败:', error);
        } finally {
          setLoading(false);
        }
      };
      
      init();
    }, [fetchChainBalances])
  );
  
  // 检查邀请绑定状态
  const checkInviteBinding = async (address: string) => {
    try {
      const result = await dappApi.checkBinding(address);
      // 如果未绑定，检查本地存储的待绑定推荐人
      if (!result.bound) {
        const pendingRef = await AsyncStorage.getItem('@deepquest_pending_referrer');
        if (pendingRef) {
          // 验证推荐人是否有效
          const validation = await dappApi.validateReferrer(pendingRef);
          if (validation.valid) {
            setPendingInviteReferrer(pendingRef);
            setInviteModalVisible(true);
          }
        }
      }
    } catch (error) {
      console.error('检查绑定状态失败:', error);
    }
  };
  
  // 绑定推荐人
  const handleBindInvite = async () => {
    if (!walletAddress || !pendingInviteReferrer) return;
    
    try {
      setBindLoading(true);
      // 直接复用激活流程（内部会先绑定推荐人，再发起链上注册）
      setActivationReferrer(pendingInviteReferrer);
      await handleActivate(pendingInviteReferrer);
    } catch (error: any) {
      showToast.error(t('index.bindFailedTitle'), error.message || t('index.bindFailedMessage'));
    } finally {
      setBindLoading(false);
      setInviteModalVisible(false);
    }
  };
  
  // 跳过绑定
  const handleSkipInvite = async () => {
    setPendingInviteReferrer(null);
    setInviteModalVisible(false);
  };

  // 获取平台统计数据
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await dappApi.getStats();
      if (response.code === 0 && response.data) {
        setStats({
          totalSupply: response.data.totalSupply || '330,000,000',
          totalBurned: response.data.totalBurned || '140,480,617',
          todayDeposit: response.data.todayDeposit || '0.00',
          networkPower: response.data.networkPower || '63,497,422',
          solPoolBalance: response.data.usdtPoolBalance || '0.00',
          dqtPoolBalance: response.data.dqtPoolBalance || '0.00',
          totalUsers: response.data.totalUsers || 0,
          totalDeposit: response.data.totalDeposit || '0.00',
          totalReward: response.data.totalReward || 0,
          dqtPrice: response.data.dqtPrice || '0.15224',
        });
      }
    } catch (error) {
      console.error('获取平台数据失败:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // 连接 TP/钱包
  const handleConnect = async () => {
    try {
      // 尝试连接钱包
      const walletInfo = await connectWallet();
      
      if (!walletInfo) {
        showToast.error(t('common.error'), t('common.walletConnectFailed'));
        return;
      }
      
      const { provider, address } = walletInfo;
      
      // 切换到 BSC 主网
      await switchToBSC();
      
      // 保存钱包地址
      await AsyncStorage.setItem(WALLET_STORAGE_KEY, address);
      setWalletAddress(address);
      
      // 1. 从后端获取用户信息（包含激活状态）
      let userData = null;
      try {
        userData = await dappApi.getUserInfo(address);
        console.log('[DApp] 从后端获取用户信息成功:', userData);
      } catch (err) {
        console.log('[DApp] 后端无该用户信息');
      }
      
      // 2. 如果后端没有该用户，则注册
      if (!userData) {
        try {
          const referrer = await AsyncStorage.getItem('@deepquest_pending_referrer') || pendingInviteReferrer || '';
          userData = await dappApi.register(address, referrer, '');
          console.log('[DApp] 后端注册成功');
        } catch (err) {
          console.log('[DApp] 后端注册跳过:', err);
        }
      }

      // 连接钱包之后 获取用户 DQ 和 SOL 余额，显示出来
      try {
        const [solBal, dqBal] = await Promise.all([
          getSOLTokenBalance(address),
          getDQTokenBalance(address)
        ]);
        setSolBalance(parseFloat(solBal).toFixed(4));
        setDqtBalance(parseFloat(dqBal).toFixed(2));
        console.log('[DApp] 余额更新:', { sol: solBal, dq: dqBal });
      } catch (err) {
        console.log('[DApp] 获取余额失败:', err);
      }

      
      // 3. 先检查本地激活状态（优先使用本地状态）
      // const localActivated = await loadLocalActivation(address);
      // if (localActivated) {
      //   console.log('[DApp] 本地已激活，使用本地激活状态');
      //   setIsOnChainRegistered(true);
      //   // 显示成功提示
      //   showToast.success('成功', `钱包已连接: ${address.slice(0, 10)}...`);
      //   showToast.success(t('common.success'), t('common.walletConnected').replace('{addr}', `${address.slice(0, 10)}...`));
      //   return;   
      // }
      
      // 4. 检查后端返回的激活状态
      // if (userData?.data?.is_activated) {
      //   // 后端已激活，同步到本地并设置已激活
      //   console.log('[DApp] 后端已激活，同步激活状态到本地');
      //   setIsOnChainRegistered(true);
      //   await saveLocalActivation(address, true);
      // } else {
        // 后端未激活，再查询链上状态
        const registered = await isUserRegisteredOnChain(address);
        console.log('[DApp] 链上激活状态:', registered);
        
        if (registered) {
          // 链上已激活，同步状态到后端和本地
          setIsOnChainRegistered(true);
          await saveLocalActivation(address, true);
          try {
            await dappApi.refreshProfileFromChain(address);
            console.log('[DApp] 激活状态同步到后端成功');
          } catch (err) {
            console.log('[DApp] 同步状态跳过:', err);
          }
        } else {
          // 链上也未激活，提示用户激活
          setIsOnChainRegistered(false);
        }
      // }
    } catch (error: any) {
      console.error('连接钱包失败:', error);
      
      // 如果 MetaMask 不可用，提供模拟选项
      if (typeof window !== 'undefined' && !window.ethereum) {
        openDialog({
          title: t('common.tips'),
          message: t('index.walletExtensionNotFound'),
          confirmText: t('common.confirm'),
          cancelText: '',
          type: 'warning',
          onConfirm: () => undefined,
          onCancel: () => undefined,
        });
      } else {
        showToast.error(t('common.error'), error.message || t('common.walletConnectFailed'));
      }
    }
  };

  // 检查链上注册状态（手动刷新用）
  const checkOnChainRegistration = async () => {
    if (!walletAddress) return;
    try {
      const registered = await isUserRegisteredOnChain(walletAddress);
      setIsOnChainRegistered(registered);
      if (registered) {
        setActivationModalVisible(false);
        showToast.success(t('common.success'), t('index.accountActivated'));
      } else {
        // 未激活，弹出激活弹窗
        setActivationModalVisible(true);
      }
    } catch (error) {
      console.error('检查链上注册失败:', error);
    }
  };

  // 点击激活按钮：直接打开激活弹窗
  const handleActivateClick = async () => {
    if (!walletAddress) {
      showToast.info(t('common.tips'), t('common.pleaseConnectWallet'));
      return;
    }
    
    // 直接打开激活弹窗（连接钱包时已查询过激活状态）
    // 填充推荐人地址
    const pendingRef = await AsyncStorage.getItem('@deepquest_pending_referrer') ;
    const bindedRef = pendingInviteReferrer || '';
    const referrerToUse = pendingRef || bindedRef;
    if (referrerToUse) {
      setActivationReferrer(referrerToUse);
    }
    setActivationModalVisible(true);
  };

  // 激活账户（发起链上注册交易）
  const handleActivate = async (referrerOverride?: string) => {
    if (!walletAddress) {
      showToast.info(t('common.tips'), t('common.pleaseConnectWallet'));
      return;
    }

    try {
      setActivating(true);

      // 先检查是否已经注册
      const alreadyRegistered = await isUserRegisteredOnChain(walletAddress);
      if (alreadyRegistered) {
        setIsOnChainRegistered(true);
        setActivationModalVisible(false);
        showToast.info(t('common.tips'), t('index.accountAlreadyActivated'));
        return;
      }

      // 优先使用用户输入的推荐人地址
      let referrer = (referrerOverride ?? activationReferrer).trim() || '';
      
      // 如果没有输入，检查本地存储的推荐人
      if (!referrer) {
        const pendingRef = await AsyncStorage.getItem('@deepquest_pending_referrer');
        if (pendingRef) {
          referrer = pendingRef;
        }
      }

      // 如果仍然没有推荐人，提示用户
      if (!referrer) {
        showToast.info(t('common.tips'), t('index.activationNeedReferrer'));
        return;
      }

      // 验证地址格式
      if (!/^0x[a-fA-F0-9]{40}$/.test(referrer)) {
        showToast.error(t('common.error'), t('index.invalidReferrerAddress'));
        return;
      }

      // 1. 先绑定推荐人关系到后端（不管激活成功失败，先绑定）
      try {
        await dappApi.bindReferrer(walletAddress, referrer);
        console.log('[DApp] 推荐人绑定成功');
      } catch (bindErr) {
        console.log('[DApp] 推荐人绑定失败，继续激活:', bindErr);
      }

      // 2. 调用合约注册
      const walletInfo = await connectWallet();
      if (!walletInfo) {
        showToast.error(t('common.error'), t('common.walletConnectFailed'));
        return;
      }
      
      const { provider, signer } = walletInfo;
      const tx = await registerUserOnChain(signer, referrer);

      openTxDialog(
        t('index.txSubmittedTitle'),
        t('index.activationTxSubmittedMessage'),
        tx.hash
      );

      // 监听交易确认
      await tx.wait();
      
      // 交易确认后，调用后端激活接口
      setTimeout(async () => {
        try {
          // 调用后端激活接口，后端会去链上查询注册交易 hash
          const result = await dappApi.activate(walletAddress);
          console.log('[DApp] 激活成功:', result);
          
          if (result.is_activated) {
            setIsOnChainRegistered(true);
            // 保存激活状态到本地
            await saveLocalActivation(walletAddress, true);
          }
        } catch (err) {
          console.log('[DApp] 激活同步失败:', err);
        }
        
        // 重新检查注册状态
        await checkOnChainRegistration();
      }, 3000); // 等待3秒确保链上状态已更新

    } catch (error: any) {
      console.error('激活失败:', error);
      // 解析合约错误信息
      let errorMsg = t('index.activateDefaultError');
      if (error.message && error.message.includes('invalid referrer')) {
        errorMsg = t('index.invalidReferrerNeedNode');
      } else if (error.message) {
        errorMsg = error.message.substring(0, 100);
      }
      showToast.error(t('index.activateFailedTitle'), errorMsg);
    } finally {
      setActivating(false);
      setActivationModalVisible(false);
    }
  };

  // 断开钱包连接
  const handleDisconnect = async () => {
    try {
      await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
    } catch (e) {
      // 忽略存储错误
    }
    setWalletAddress(null);
    setBnbBalance('0.0');
    setDqtBalance('0.0');
    setUserInfo(null);
    // 刷新页面
    router.replace('/(dapp)');
  };

  // 兑换操作
  const handleSwap = async () => {
    console.log('[handleSwap] 开始执行兑换', { walletAddress, sellAmount, dqtBalance });
    
    if (!walletAddress) {
      console.log('[handleSwap] 钱包未连接，返回');
      showToast.info(t('common.tips'), t('common.pleaseConnectWallet'));
      return;
    }
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      console.log('[handleSwap] 兑换数量无效，返回');
      showToast.info(t('common.tips'), t('index.pleaseInputSwapAmount'));
      return;
    }

    // 检查 DQ 余额
    const dqBalance = parseFloat(dqtBalance);
    const sellAmountNum = parseFloat(sellAmount);
    if (sellAmountNum > dqBalance) {
      console.log('[handleSwap] DQ 余额不足', { sellAmountNum, dqBalance });
      showToast.info(t('common.tips'), t('index.insufficientDqBalance'));
      return;
    }

    try {
      setSubmitting(true);

      // 检查是否连接了钱包
      if (typeof window !== 'undefined' && window.ethereum) {
        // 1. 获取钱包信息
        const walletInfo = await connectWallet();
        if (!walletInfo) {
          showToast.error(t('common.error'), t('common.walletConnectFailed'));
          return;
        }

        const { signer } = walletInfo;

        // 2. 检查授权额度
        const allowance = await checkDQAllowance(walletAddress, CONTRACT_ADDRESSES.DQPROJECT.address);
        console.log('[DApp] DQ 授权额度:', allowance);

        if (parseFloat(allowance) < sellAmountNum) {
          // 需要授权
          openDialog({
            title: t('index.needApproveTitle'),
            message: t('index.needApproveMessage'),
            confirmText: t('index.approveAction'),
            cancelText: t('common.cancel'),
            type: 'warning',
            onCancel: () => {
              setSubmitting(false);
            },
            onConfirm: async () => {
              try {
                const approveTx = await approveDQToken(signer, sellAmount, CONTRACT_ADDRESSES.DQPROJECT.address);
                openTxDialog(t('index.approveSubmittedTitle'), t('index.waitForChainConfirm'), approveTx.hash);

                // 等待授权确认
                await approveTx.wait();

                // 授权完成后，执行兑换
                const swapTx = await sellDQForSOL(signer, sellAmount, '0');
                openTxDialog(
                  t('index.swapSubmittedTitle'),
                  t('index.swappingMessage').replace('{amount}', sellAmount),
                  swapTx.hash
                );

                // 等待兑换确认
                await swapTx.wait();

                // 刷新余额
                const [newSolBal, newDqBal] = await Promise.all([
                  getSOLTokenBalance(walletAddress),
                  getDQTokenBalance(walletAddress)
                ]);
                setSolBalance(parseFloat(newSolBal).toFixed(4));
                setDqtBalance(parseFloat(newDqBal).toFixed(2));

                showToast.success(t('index.swapSuccessTitle'), t('index.swapSuccessMessage').replace('{amount}', sellAmount));
                setSellAmount('');
              } catch (error: any) {
                console.error('授权或兑换失败:', error);
                showToast.error(t('common.error'), error.message || t('index.approveOrSwapFailed'));
              } finally {
                setSubmitting(false);
              }
            },
          });
          return;
        }

        // 3. 已有足够授权，直接兑换
        const swapTx = await sellDQForSOL(signer, sellAmount, '0');
        openTxDialog(
          t('index.swapSubmittedTitle'),
          t('index.swappingMessage').replace('{amount}', sellAmount),
          swapTx.hash
        );

        // 等待交易确认
        await swapTx.wait();

        // 刷新余额
        const [newSolBal, newDqBal] = await Promise.all([
          getSOLTokenBalance(walletAddress),
          getDQTokenBalance(walletAddress)
        ]);
        setSolBalance(parseFloat(newSolBal).toFixed(4));
        setDqtBalance(parseFloat(newDqBal).toFixed(2));

        showToast.success(t('index.swapSuccessTitle'), t('index.swapSuccessMessage').replace('{amount}', sellAmount));
        setSellAmount('');
      } else {
        // 模拟模式 - 调用后端 API
        showToast.info(t('common.tips'), t('index.pleaseUseWalletToSwap'));
      }
    } catch (error: any) {
      console.error('兑换失败:', error);
      let errorMsg = error.message || t('index.swapFailedRetry');
      if (error.message && error.message.includes('insufficient allowance')) {
        errorMsg = t('index.insufficientAllowance');
      } else if (error.message && error.message.includes('insufficient balance')) {
        errorMsg = t('index.insufficientDqBalance');
      }
      showToast.error(t('common.error'), errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // 质押操作
  const handleStake = async () => {
    if (!walletAddress) {
      showToast.info(t('common.tips'), t('common.pleaseConnectWallet'));
      return;
    }
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      showToast.info(t('common.tips'), t('index.pleaseInputStakeAmount'));
      return;
    }
    
    try {
      setSubmitting(true);
      
      // 检查是否连接了钱包
      if (typeof window !== 'undefined' && window.ethereum) {
        // 获取钱包信息
        const walletInfo = await connectWallet();
        if (!walletInfo) {
          showToast.error(t('common.error'), t('common.walletConnectFailed'));
          return;
        }

        const { signer } = walletInfo;
        const periodIndex = stakePeriods.findIndex((period) => period.days === stakePeriod);

        if (periodIndex < 0) {
          throw new Error(t('index.stakeFailedRetry'));
        }

        const allowance = await checkDQAllowance(walletAddress);
        if (parseFloat(allowance) < parseFloat(stakeAmount)) {
          openDialog({
            title: t('index.needApproveTitle'),
            message: t('index.needApproveMessage'),
            confirmText: t('index.approveAction'),
            cancelText: t('common.cancel'),
            type: 'warning',
            onCancel: () => {
              setSubmitting(false);
            },
            onConfirm: async () => {
              try {
                const approveTx = await approveDQToken(signer, stakeAmount);
                openTxDialog(t('index.approveSubmittedTitle'), t('index.waitForChainConfirm'), approveTx.hash);
                await approveTx.wait();

                const tx = await stakeDQOnChain(signer, stakeAmount, periodIndex);
                openTxDialog(
                  t('index.txSubmittedTitle'),
                  t('index.stakeSubmittedMessage')
                    .replace('{amount}', stakeAmount)
                    .replace('{hash}', `${tx.hash.slice(0, 20)}...`),
                  tx.hash
                );
                await tx.wait();
                await dappApi.stake(walletAddress, stakeAmount, tx.hash, stakePeriod);
                showToast.success(t('common.success'), t('index.stakeSuccess'));
                setStakeAmount('');
              } catch (error: any) {
                console.error('授权或质押失败:', error);
                showToast.error(t('common.error'), error.message || t('index.stakeFailedRetry'));
              } finally {
                setSubmitting(false);
              }
            },
          });
          return;
        }
        
        // 调用链上 DQ 质押
        const tx = await stakeDQOnChain(signer, stakeAmount, periodIndex);

        openTxDialog(
          t('index.txSubmittedTitle'),
          t('index.stakeSubmittedMessage')
            .replace('{amount}', stakeAmount)
            .replace('{hash}', `${tx.hash.slice(0, 20)}...`),
          tx.hash
        );
        await tx.wait();
        await dappApi.stake(walletAddress, stakeAmount, tx.hash, stakePeriod);
        showToast.success(t('common.success'), t('index.stakeSuccess'));
        setStakeAmount('');
      } else {
        // 模拟模式 - 调用后端 API
        const txHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const response = await dappApi.stake(walletAddress, stakeAmount, txHash, stakePeriod);
        
        if (response.code === 0) {
          showToast.success(
            t('common.success'),
            t('index.stakeSuccessMessage')
              .replace('{amount}', stakeAmount)
              .replace('{hash}', `${txHash.slice(0, 20)}...`)
          );
          setStakeAmount('');
        } else {
          showToast.error(t('common.error'), response.message || t('index.stakeFailed'));
        }
      }
    } catch (error: any) {
      console.error('质押失败:', error);
      showToast.error(t('common.error'), error.message || t('index.stakeFailedRetry'));
    } finally {
      setSubmitting(false);
    }
  };

  // 兑换/质押确定
  const handleConfirm = () => {
    console.log('确认操作:', { 
      mode, 
      sellAmount, 
      buyAmount, 
      stakeAmount, 
      stakePeriod,
      walletAddress,
      isOnChainRegistered
    });
    if (mode === 'swap') {
      // 兑换
      handleSwap();
    } else {
      // 质押
      handleStake();
    }
  };

  // 复制地址
  const handleCopyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      showToast.success(t('profile.copied'), t('profile.walletCopied'));
    }
  };

  // 打开社交链接
  const openTelegram = () => Linking.openURL('https://t.me/deepquest');
  const openTwitter = () => Linking.openURL('https://twitter.com/deepquest');

  // 计算百分比
  const handlePercent = (percent: number, setter: (v: string) => void, balance: string) => {
    const bal = parseFloat(balance) || 0;
    if (percent === 100) {
      setter(bal.toString());
    } else {
      const amount = (bal * percent) / 100;
      setter(amount.toFixed(6));
    }
  };

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: BG_DARK }}>
          <ActivityIndicator size="large" color={YELLOW} />
          <Text className="text-white mt-4">{t('common.loading')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ConfirmDialog
        visible={dialogState.visible}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        type={dialogState.type}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: BG_DARK }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 顶部导航 */}
        <LogoHeader
          showMenuButton
          menuExpanded={menuExpanded}
          onMenuPress={() => setMenuExpanded(!menuExpanded)}
        />

        {/* 快捷菜单折叠区域 */}
        {menuExpanded && (
          <View className="px-4 pb-3">
            <View 
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
            >
              {/* 添加 LP */}
              <TouchableOpacity
                className="flex-row items-center gap-3 p-4 border-b"
                style={{ borderColor: BORDER_GRAY }}
                onPress={() => { router.push('/lp'); setMenuExpanded(false); }}
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
                className="flex-row items-center gap-3 p-4 border-b"
                style={{ borderColor: BORDER_GRAY }}
                onPress={() => { router.push('/profile'); setMenuExpanded(false); }}
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
                onPress={() => { router.push('/team'); setMenuExpanded(false); }}
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
                onPress={() => { router.push('/stakes'); setMenuExpanded(false); }}
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

              <TouchableOpacity
                className="flex-row items-center gap-3 p-4 border-b"
                style={{ borderColor: BORDER_GRAY }}
                onPress={() => { router.push('/rewards'); setMenuExpanded(false); }}
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
                onPress={() => { router.push('/withdrawals'); setMenuExpanded(false); }}
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
                onPress={() => { router.push('/nodes'); setMenuExpanded(false); }}
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
            </View>
          </View>
        )}

        {/* 钱包+注册 */}
        <View className="px-4 pb-2">
          <View className="flex-row items-center gap-2">
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
                {/* 未激活提示 */}
                {!isOnChainRegistered && (
                  <TouchableOpacity
                    className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(255,210,63,0.2)', borderWidth: 1, borderColor: YELLOW }}
                    onPress={handleActivateClick}
                  >
                    <Ionicons name="warning" size={14} color={YELLOW} />
                      <Text className="text-sm" style={{ color: YELLOW }}>{t('dapp.activate')}</Text>
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
                style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
                onPress={handleConnect}
              >
                <Text className="text-sm" style={{ color: TEXT_WHITE }}>{t('home.connectWallet')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 语言切换 */}
        <View className="px-4 pb-2">
          <TouchableOpacity
            className="flex-row items-center gap-1.5"
            onPress={() => setLangModalVisible(true)}
          >
            <Ionicons name="globe-outline" size={14} color={YELLOW} />
            <Text className="text-xs" style={{ color: YELLOW }}>
              {t('home.language')}：{languages.find(l => l.code === language)?.nativeName || languages[0]?.nativeName || ''}
            </Text>
            <Ionicons name="chevron-down" size={12} color={YELLOW} />
          </TouchableOpacity>
        </View>

        {/* 语言选择 Modal */}
        <Modal
          visible={langModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLangModalVisible(false)}
        >
          <TouchableOpacity
            className="flex-1 justify-center items-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onPress={() => setLangModalVisible(false)}
            activeOpacity={1}
          >
            <View
              className="w-64 rounded-2xl overflow-hidden"
              style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: BORDER_GRAY }}
            >
              <View className="p-4 border-b" style={{ borderColor: BORDER_GRAY }}>
                <Text className="text-base font-semibold text-center" style={{ color: TEXT_WHITE }}>
                  {t('home.language')}
                </Text>
              </View>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  className="flex-row items-center justify-between p-4 border-b"
                  style={{ borderColor: BORDER_GRAY }}
                  onPress={() => {
                    setLanguage(lang.code);
                    setLangModalVisible(false);
                  }}
                >
                  <Text style={{ color: TEXT_WHITE, fontSize: 15 }}>{lang.nativeName}</Text>
                  {language === lang.code && (
                    <Ionicons name="checkmark" size={20} color={YELLOW} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                className="p-4 items-center"
                onPress={() => setLangModalVisible(false)}
              >
                <Text style={{ color: TEXT_MUTED, fontSize: 14 }}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 账户激活弹窗 */}
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
                <Text style={styles.activationModalTitle}>{t('dapp.activationModalTitle')}</Text>
              </View>
              
              <Text style={styles.activationModalDesc}>
                {t('dapp.activationModalDesc')}
              </Text>
              
              <View style={styles.activationInfoBox}>
                <Text style={styles.activationInfoLabel}>{t('dapp.activationInfoLabel')}</Text>
                <Text style={styles.activationInfoText}>{t('dapp.activationStep1')}</Text>
                <Text style={styles.activationInfoText}>{t('dapp.activationStep2')}</Text>
                <Text style={styles.activationInfoText}>{t('dapp.activationStep3')}</Text>
                <Text style={styles.activationInfoText}>{t('dapp.activationStep4')}</Text>
              </View>

              {/* 推荐人地址输入 */}
              <View style={styles.referrerInputBox}>
                <Text style={styles.referrerInputLabel}>{t('dapp.referrerInputLabel')}</Text>
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
                  <Text style={styles.skipBtnText}>{t('dapp.activateLater')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.activationModalBtn, styles.activateBtn]}
                  onPress={() => handleActivate()}
                  disabled={activating}
                >
                  {activating ? (
                    <ActivityIndicator size="small" color="#0A0A12" />
                  ) : (
                    <Text style={styles.activateBtnText}>{t('index.activateNow')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 邀请绑定弹窗 */}
        <Modal
          visible={inviteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setInviteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.inviteModalContent}>
              <View style={styles.inviteModalHeader}>
                <Ionicons name="people-circle" size={48} color={YELLOW} />
                <Text style={styles.inviteModalTitle}>{t('dapp.inviteModalTitle')}</Text>
              </View>
              
              <Text style={styles.inviteModalDesc}>
                {t('dapp.inviteModalDesc')}
              </Text>
              
              {pendingInviteReferrer && (
                <View style={styles.referrerAddressBox}>
                  <Text style={styles.referrerLabel}>{t('dapp.referrerAddressLabel')}</Text>
                  <Text style={styles.referrerAddress} numberOfLines={1} ellipsizeMode="middle">
                    {pendingInviteReferrer}
                  </Text>
                </View>
              )}
              
              <View style={styles.inviteModalButtons}>
                <TouchableOpacity
                  style={[styles.inviteModalBtn, styles.skipBtn]}
                  onPress={handleSkipInvite}
                >
                  <Text style={styles.skipBtnText}>{t('dapp.skipBind')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inviteModalBtn, styles.bindBtn]}
                  onPress={handleBindInvite}
                  disabled={bindLoading}
                >
                  {bindLoading ? (
                    <ActivityIndicator size="small" color="#0A0A12" />
                  ) : (
                    <Text style={styles.bindBtnText}>{t('dapp.confirmBind')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 模式切换 */}
        <View className="px-4 pb-2">
          <View className="flex-row rounded-xl overflow-hidden" style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}>
            <TouchableOpacity
              className="flex-1 py-3 items-center"
              style={{ backgroundColor: mode === 'swap' ? YELLOW : 'transparent' }}
              onPress={() => setMode('swap')}
            >
              <Text className="text-sm font-medium" style={{ color: mode === 'swap' ? '#333' : TEXT_MUTED }}>
                {t('home.swap')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 items-center"
              style={{ backgroundColor: mode === 'stake' ? YELLOW : 'transparent' }}
              onPress={() => setMode('stake')}
            >
              <Text className="text-sm font-medium" style={{ color: mode === 'stake' ? '#333' : TEXT_MUTED }}>
                {t('home.stake')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 交易区 */}
        <View className="px-4 pt-2 gap-3">
          {/* 质押模式 */}
          {mode === 'stake' && (
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: CYAN }}>
                    <Ionicons name="diamond" size={16} color="#0A0A12" />
                  </View>
                  <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>{t('dapp.stakeDqTitle')}</Text>
                </View>
                <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                  {t('dapp.balanceLabel')}: {dqtBalance} DQ
                </Text>
              </View>

              <TextInput
                className="text-xl font-semibold mb-3"
                style={{ color: TEXT_WHITE, backgroundColor: 'transparent' }}
                placeholder={t('home.inputAmount')}
                placeholderTextColor={TEXT_MUTED}
                value={stakeAmount}
                onChangeText={setStakeAmount}
                keyboardType="decimal-pad"
              />

              <View className="flex-row gap-2 mb-3">
                {[
                  { label: '25%', value: 25 },
                  { label: '50%', value: 50 },
                  { label: '75%', value: 75 },
                  { label: 'MAX', value: 100 },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    className="flex-1 py-2.5 rounded-lg items-center"
                    style={{
                      backgroundColor: item.label === 'MAX' ? CYAN : 'transparent',
                      borderWidth: 1,
                      borderColor: item.label === 'MAX' ? CYAN : BORDER_GRAY,
                    }}
                    onPress={() => handlePercent(item.value, setStakeAmount, dqtBalance)}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: item.label === 'MAX' ? '#0A0A12' : TEXT_WHITE }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 质押周期选择 */}
              <View className="mb-3">
                <Text className="text-sm mb-2" style={{ color: TEXT_MUTED }}>{t('dapp.selectStakePeriod')}</Text>
                <View className="flex-row gap-2">
                  {stakePeriods.map((period) => (
                    <TouchableOpacity
                      key={period.days}
                      className="flex-1 py-2.5 rounded-lg items-center"
                      style={{
                        backgroundColor: stakePeriod === period.days ? YELLOW : 'transparent',
                        borderWidth: 1,
                        borderColor: stakePeriod === period.days ? YELLOW : BORDER_GRAY,
                      }}
                      onPress={() => setStakePeriod(period.days)}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: stakePeriod === period.days ? '#333' : TEXT_WHITE }}
                      >
                        {period.label}
                      </Text>
                      <Text
                        className="text-xs"
                        style={{ color: stakePeriod === period.days ? '#333' : YELLOW }}
                      >
                        {period.reward}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 质押说明 */}
              <View className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="information-circle" size={16} color={CYAN} />
                  <Text className="text-sm font-medium" style={{ color: CYAN }}>{t('home.stakeInfo')}</Text>
                </View>
                <Text className="text-xs" style={{ color: TEXT_MUTED }}>
                  • {t('dapp.stakeInfoLine1')}{'\n'}
                  • {t('dapp.stakeInfoLine2')
                    .replace('{days}', String(stakePeriod))
                    .replace('{reward}', stakePeriods.find((period) => period.days === stakePeriod)?.reward || '')}{'\n'}
                  • {t('dapp.stakeInfoLine3')}{'\n'}
                  • {t('dapp.stakeInfoLine4')}
                </Text>
              </View>
            </View>
          )}

          {/* 兑换模式 */}
          {mode === 'swap' && (
            <>
              {/* 出售区 */}
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: CYAN }}>
                      <Ionicons name="diamond" size={16} color="#0A0A12" />
                    </View>
                    <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>
                      DQ
                    </Text>
                  </View>
                  <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                      {t('dapp.balanceLabel')}: {dqtBalance} DQ
                  </Text>
                </View>

                <TextInput
                  className="text-xl font-semibold mb-3"
                  style={{ color: TEXT_WHITE, backgroundColor: 'transparent' }}
                  placeholder={t('home.inputAmount')}
                  placeholderTextColor={TEXT_MUTED}
                  value={sellAmount}
                  onChangeText={setSellAmount}
                  keyboardType="decimal-pad"
                />

                <View className="flex-row gap-2">
                  {[
                    { label: '25%', value: 25 },
                    { label: '50%', value: 50 },
                    { label: '75%', value: 75 },
                    { label: 'MAX', value: 100 },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      className="flex-1 py-2.5 rounded-lg items-center"
                      style={{
                        backgroundColor: item.label === 'MAX' ? CYAN : 'transparent',
                        borderWidth: 1,
                        borderColor: item.label === 'MAX' ? CYAN : BORDER_GRAY,
                      }}
                      onPress={() => {
                        if (dqtBalance) {
                          handlePercent(item.value, setSellAmount, dqtBalance);
                        }
                      }}
                    >
                      <Text
                        className="text-sm font-medium"
                        style={{ color: item.label === 'MAX' ? '#0A0A12' : TEXT_WHITE }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: SOL_PURPLE }}>
                      <Text className="text-sm font-bold text-white">S</Text>
                    </View>
                    <Text className="text-base font-semibold" style={{ color: TEXT_WHITE }}>
                      SOL
                    </Text>
                  </View>
                  <Text className="text-sm" style={{ color: TEXT_MUTED }}>
                      {t('dapp.balanceLabel')}: {solBalance} SOL
                  </Text>
                </View>

                <View className="h-12 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(0,240,255,0.05)' }}>
                  <View className="flex-1 flex-row items-end px-2 gap-0.5">
                    {[30, 45, 35, 50, 40, 55, 45, 60, 50, 65, 55, 70, 60, 55, 65].map((h, i) => (
                      <View key={i} className="flex-1 rounded-sm" style={{
                        height: `${h}%`,
                        backgroundColor: i > 10 ? SOL_PURPLE : 'rgba(208,32,255,0.5)'
                      }} />
                    ))}
                  </View>
                </View>
              </View>
            </>
          )}

          {/* 确定兑换按钮 */}
          <TouchableOpacity
            className="py-4 rounded-xl items-center"
            style={{ backgroundColor: YELLOW }}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#333" />
            ) : (
              <Text className="text-base font-semibold" style={{ color: '#333' }}>
                {mode === 'swap' ? t('home.confirmSwap') : t('home.confirmStake')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 数据卡片区 */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-base font-semibold mb-3" style={{ color: TEXT_WHITE }}>
            {t('home.networkData')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {/* 今日入单 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: YELLOW }}
            >
              <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('home.todayDeposit')}</Text>
              <Text className="text-lg font-bold" style={{ color: YELLOW }}>
                {statsLoading ? '...' : stats.todayDeposit}
              </Text>
            </View>
            
            {/* 全网算力 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: CYAN }}
            >
              <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('dapp.networkPowerLabel')}</Text>
              <Text className="text-lg font-bold" style={{ color: CYAN }}>
                {statsLoading ? '...' : stats.networkPower}
              </Text>
            </View>
            
            {/* 总销毁 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: PURPLE }}
            >
              <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('dapp.totalBurnedLabel')}</Text>
              <Text className="text-lg font-bold" style={{ color: PURPLE }}>
                {statsLoading ? '...' : stats.totalBurned}
              </Text>
            </View>
            
            {/* 总用户 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: BG_CARD_SOLID, borderWidth: 1, borderColor: TEXT_MUTED }}
            >
              <Text className="text-xs mb-1" style={{ color: TEXT_MUTED }}>{t('dapp.totalUsersLabel')}</Text>
              <Text className="text-lg font-bold" style={{ color: TEXT_WHITE }}>
                {statsLoading ? '...' : stats.totalUsers}
              </Text>
            </View>
          </View>
        </View>

        {/* 底池数据 */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-base font-semibold mb-3" style={{ color: TEXT_WHITE }}>
            {t('dapp.poolDataTitle')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {/* SOL池 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: SOL_PURPLE }}
            >
              <Text className="text-xs mb-1" style={{ color: '#FFF' }}>{t('dapp.solPoolLabel')}</Text>
              <Text className="text-lg font-bold" style={{ color: '#FFF' }}>
                {statsLoading ? '...' : stats.solPoolBalance}
              </Text>
            </View>
            
            {/* DQ池 */}
            <View 
              className="w-[calc(50%-4px)] p-3 rounded-xl"
              style={{ backgroundColor: CYAN }}
            >
              <Text className="text-xs mb-1" style={{ color: '#0A0A12' }}>{t('dapp.dqPoolLabel')}</Text>
              <Text className="text-lg font-bold" style={{ color: '#0A0A12' }}>
                {statsLoading ? '...' : stats.dqtPoolBalance}
              </Text>
            </View>
          </View>
        </View>

        {/* 社交链接 */}
        <View className="px-4 pt-4 pb-8">
          <View className="flex-row justify-center gap-4">
            <TouchableOpacity
              className="flex-row items-center gap-2 px-4 py-2 rounded-lg"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              onPress={openTelegram}
            >
              <Ionicons name="paper-plane" size={18} color="#0088CC" />
              <Text className="text-sm" style={{ color: TEXT_WHITE }}>Telegram</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              className="flex-row items-center gap-2 px-4 py-2 rounded-lg"
              style={{ backgroundColor: BG_CARD_TRANS, borderWidth: 1, borderColor: BORDER_GRAY }}
              onPress={openTwitter}
            >
              <Ionicons name="logo-twitter" size={18} color="#1DA1F2" />
              <Text className="text-sm" style={{ color: TEXT_WHITE }}>Twitter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  inviteModalContent: {
    backgroundColor: BG_CARD_TRANS,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: YELLOW,
  },
  inviteModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  inviteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_WHITE,
    marginTop: 12,
  },
  inviteModalDesc: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  referrerAddressBox: {
    backgroundColor: BG_DARK,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  referrerLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  referrerAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: CYAN,
  },
  inviteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteModalBtn: {
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
  bindBtn: {
    backgroundColor: YELLOW,
  },
  bindBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BG_DARK,
  },
  // 激活弹窗样式
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
  activateBtn: {
    backgroundColor: YELLOW,
  },
  activateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BG_DARK,
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
});
