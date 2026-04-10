import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/Screen';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeSearchParams } from '@/hooks/useSafeRouter';
import { usersApi } from '@/utils/api';

interface User {
  id: number;
  wallet_address: string;
  referrer_address: string;
  direct_count: number;
  level: number;
  total_invest: string;
  team_invest: string;
  energy: string;
  lp_shares: string;
  pending_rewards: string;
  direct_sales: string;
  d_level: number;
  is_partner: boolean;
  card_type: number;
  nft_token_id: number;
  created_at: string;
}

interface Deposit {
  id: number;
  tx_hash: string;
  amount: string;
  phase: number;
  status: string;
  created_at: string;
}

interface Reward {
  id: number;
  reward_type: string;
  amount: string;
  from_address: string;
  created_at: string;
}

interface TeamMember {
  wallet_address: string;
  level: number;
  total_invest: string;
  team_invest: string;
  direct_count: number;
  is_partner: boolean;
  created_at: string;
}

type TabType = 'deposits' | 'rewards' | 'team';

export default function UserDetailScreen() {
  const { address } = useSafeSearchParams<{ address: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('deposits');

  const fetchData = useCallback(async () => {
    if (!address) return;
    
    try {
      const [userData, depositsData, rewardsData, teamData] = await Promise.all([
        usersApi.getByAddress(address),
        usersApi.getDeposits(address, 1, 50),
        usersApi.getRewards(address, { pageSize: 50 }),
        usersApi.getTeam(address),
      ]);
      setUser(userData);
      setDeposits(depositsData.data || []);
      setRewards(rewardsData.data || []);
      setTeam(teamData || []);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return 'N/A';
    if (addr.length > 16) {
      return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
    }
    return addr;
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return num.toFixed(4);
  };

  const getRewardTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      direct: 'Direct',
      node: 'Node',
      management: 'Management',
      dao: 'DAO',
      lp: 'LP',
      nft: 'NFT',
      team: 'Team',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#00F0FF" size="large" />
          <Text style={styles.loadingText}>LOADING USER DATA...</Text>
        </View>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00F0FF" />
        }
      >
        {/* User Header */}
        <View style={styles.userHeader}>
          <LinearGradient
            colors={['#00F0FF', '#BF00FF']}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>
              {user.wallet_address.slice(0, 2).toUpperCase()}
            </Text>
          </LinearGradient>
          
          <View style={styles.userInfo}>
            <Text style={styles.walletAddress}>{formatAddress(user.wallet_address)}</Text>
            {user.is_partner && (
              <LinearGradient
                colors={['#BF00FF', '#00F0FF']}
                style={styles.partnerBadge}
              >
                <Text style={styles.partnerText}>PARTNER</Text>
              </LinearGradient>
            )}
          </View>
        </View>

        {/* User Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>LEVEL</Text>
            <Text style={styles.statValue}>S{user.level}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>D-LEVEL</Text>
            <Text style={styles.statValue}>D{user.d_level}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL INVEST</Text>
            <Text style={[styles.statValue, { color: '#00FF88' }]}>
              {formatAmount(user.total_invest)} SOL
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TEAM INVEST</Text>
            <Text style={[styles.statValue, { color: '#00F0FF' }]}>
              {formatAmount(user.team_invest)} SOL
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>DIRECT SALES</Text>
            <Text style={styles.statValue}>{formatAmount(user.direct_sales)} SOL</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>DIRECT COUNT</Text>
            <Text style={styles.statValue}>{user.direct_count}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>PENDING REWARDS</Text>
            <Text style={[styles.statValue, { color: '#FFD700' }]}>
              {formatAmount(user.pending_rewards)} SOL
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>LP SHARES</Text>
            <Text style={styles.statValue}>{formatAmount(user.lp_shares)}</Text>
          </View>
        </View>

        {/* Referrer */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Referrer:</Text>
          <Text style={styles.infoValue}>{formatAddress(user.referrer_address)}</Text>
        </View>

        {/* Card Type */}
        {user.card_type && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>NFT Card:</Text>
            <LinearGradient
              colors={user.card_type === 1 ? ['#FFD700', '#FFA500'] : 
                     user.card_type === 2 ? ['#00F0FF', '#0080FF'] : ['#BF00FF', '#8000FF']}
              style={styles.cardBadge}
            >
              <Text style={styles.cardText}>
                {user.card_type === 1 ? 'A' : user.card_type === 2 ? 'B' : 'C'} CARD
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'deposits' && styles.activeTab]}
            onPress={() => setActiveTab('deposits')}
          >
            <Text style={[styles.tabText, activeTab === 'deposits' && styles.activeTabText]}>
              DEPOSITS ({deposits.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rewards' && styles.activeTab]}
            onPress={() => setActiveTab('rewards')}
          >
            <Text style={[styles.tabText, activeTab === 'rewards' && styles.activeTabText]}>
              REWARDS ({rewards.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'team' && styles.activeTab]}
            onPress={() => setActiveTab('team')}
          >
            <Text style={[styles.tabText, activeTab === 'team' && styles.activeTabText]}>
              TEAM ({team.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'deposits' && (
          <View style={styles.listContainer}>
            {deposits.length === 0 ? (
              <Text style={styles.emptyText}>No deposits</Text>
            ) : (
              deposits.map((deposit) => (
                <View key={deposit.id} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <Text style={styles.listItemAmount}>{formatAmount(deposit.amount)} SOL</Text>
                    <Text style={styles.listItemPhase}>Phase {deposit.phase}</Text>
                  </View>
                  <Text style={styles.listItemDate}>
                    {new Date(deposit.created_at).toLocaleString()}
                  </Text>
                  <Text style={styles.listItemHash}>TX: {formatAddress(deposit.tx_hash)}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'rewards' && (
          <View style={styles.listContainer}>
            {rewards.length === 0 ? (
              <Text style={styles.emptyText}>No rewards</Text>
            ) : (
              rewards.map((reward) => (
                <View key={reward.id} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <Text style={[styles.listItemAmount, { color: '#00FF88' }]}>
                      +{formatAmount(reward.amount)} SOL
                    </Text>
                    <Text style={styles.rewardType}>{getRewardTypeLabel(reward.reward_type)}</Text>
                  </View>
                  <Text style={styles.listItemDate}>
                    {new Date(reward.created_at).toLocaleString()}
                  </Text>
                  {reward.from_address && (
                    <Text style={styles.listItemHash}>From: {formatAddress(reward.from_address)}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'team' && (
          <View style={styles.listContainer}>
            {team.length === 0 ? (
              <Text style={styles.emptyText}>No team members</Text>
            ) : (
              team.map((member) => (
                <View key={member.wallet_address} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <Text style={styles.memberAddress}>{formatAddress(member.wallet_address)}</Text>
                    {member.is_partner && (
                      <Text style={styles.partnerTag}>P</Text>
                    )}
                  </View>
                  <View style={styles.memberStats}>
                    <Text style={styles.memberStat}>Invest: {formatAmount(member.total_invest)}</Text>
                    <Text style={styles.memberStat}>Level: S{member.level}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
    gap: 16,
  },
  loadingText: {
    color: '#00F0FF',
    fontSize: 14,
    letterSpacing: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
  },
  errorText: {
    color: '#FF003C',
    fontSize: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  avatarGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0A0A0F',
  },
  userInfo: {
    flex: 1,
  },
  walletAddress: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#00F0FF',
    marginBottom: 4,
  },
  partnerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  partnerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0A0A0F',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 10,
    color: '#555570',
    letterSpacing: 2,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EAEAEA',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#555570',
  },
  infoValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#00F0FF',
  },
  cardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0A0A0F',
    letterSpacing: 1,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#12121A',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.1)',
  },
  activeTab: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: '#00F0FF',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555570',
    letterSpacing: 1,
  },
  activeTabText: {
    color: '#00F0FF',
  },
  listContainer: {
    gap: 8,
  },
  listItem: {
    backgroundColor: '#12121A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.1)',
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listItemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EAEAEA',
  },
  listItemPhase: {
    fontSize: 10,
    color: '#555570',
  },
  listItemDate: {
    fontSize: 11,
    color: '#555570',
  },
  listItemHash: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#555570',
    marginTop: 4,
  },
  rewardType: {
    fontSize: 10,
    fontWeight: '600',
    color: '#BF00FF',
    backgroundColor: 'rgba(191, 0, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyText: {
    color: '#555570',
    fontSize: 14,
    textAlign: 'center',
    padding: 24,
  },
  memberAddress: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#00F0FF',
  },
  partnerTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#BF00FF',
  },
  memberStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  memberStat: {
    fontSize: 11,
    color: '#555570',
  },
});
