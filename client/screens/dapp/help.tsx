import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

// 精确匹配参考图的颜色体系
const BG_DARK = '#0A0A12';
const BG_CARD_TRANS = 'rgba(26, 26, 48, 0.95)';
const BG_CARD_SOLID = '#101018';
const YELLOW = '#FFD23F';
const BORDER_GRAY = '#303040';
const TEXT_WHITE = '#F5F5F5';
const TEXT_MUTED = '#A0A0B0';
const CYAN = '#00F0FF';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface GuideItem {
  id: string;
  title: string;
  icon: string;
  description: string;
  color: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: '什么是 DeepQuest？',
    answer: 'DeepQuest 是一个基于 BSC 链的 DeFi 量化平台，通过智能合约技术为用户提供安全、透明的质押和收益服务。平台采用创新的代币经济模型，让用户能够通过质押 DQT 代币获得稳定的被动收入。',
  },
  {
    id: '2',
    question: '如何开始使用 DeepQuest？',
    answer: '1. 连接您的 BSC 钱包\n2. 点击"质押"功能，选择质押数量\n3. 确认交易后，质押生效\n4. 每日自动获得收益奖励\n5. 可随时查看质押记录和收益明细',
  },
  {
    id: '3',
    question: '质押的最小/最大数量是多少？',
    answer: '最小质押数量为 100 DQT，最大质押数量根据您钱包余额而定。建议您根据自身情况合理配置资产。',
  },
  {
    id: '4',
    question: '收益是如何计算的？',
    answer: '每日收益率根据质押时间长短而定：\n- 基础收益率：0.5%/天\n- 节点合伙人：0.8%/天\n- 节点代表：1.2%/天\n收益每日结算，自动发放到您的账户。',
  },
  {
    id: '5',
    question: '如何成为节点？',
    answer: '成为节点需要满足以下条件：\n1. 节点合伙人：质押 ≥10,000 DQT\n2. 节点代表：质押 ≥50,000 DQT\n3. 提交节点申请并通过审核\n成为节点后可享受更高的收益率和专属权益。',
  },
  {
    id: '6',
    question: '推广奖励是如何计算的？',
    answer: '推广奖励采用多代推荐机制：\n- 一代（直接推荐）：获得下线质押金额的 5%\n- 二代：获得下线质押金额的 2%\n- 三代：获得下线质押金额的 1%\n推广奖励即时生效，自动发放。',
  },
  {
    id: '7',
    question: '质押多久可以提取？',
    answer: '质押采用灵活机制，您可以随时申请提取。但建议长期持有以获得更稳定的收益。提前提取不影响已获得的收益。',
  },
  {
    id: '8',
    question: '如何联系官方客服？',
    answer: '您可以通过以下方式联系我们：\n- Telegram 官方群：@deepquest\n- Twitter：@deepquest\n官方团队不会主动私信您，请注意防骗。',
  },
];

const GUIDE_DATA: GuideItem[] = [
  {
    id: '1',
    title: '质押操作指南',
    icon: 'wallet',
    description: '了解如何进行质押操作',
    color: YELLOW,
  },
  {
    id: '2',
    title: '收益领取教程',
    icon: 'gift',
    description: '如何查看和领取收益',
    color: CYAN,
  },
  {
    id: '3',
    title: '推广技巧',
    icon: 'people',
    description: '如何有效推广获取奖励',
    color: '#D020FF',
  },
  {
    id: '4',
    title: '节点升级指南',
    icon: 'ribbon',
    description: '升级节点享受更高收益',
    color: '#00FF88',
  },
];

export default function DappHelp() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openTelegram = () => Linking.openURL('https://t.me/deepquest');
  const openTwitter = () => Linking.openURL('https://twitter.com/deepquest');

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: BG_DARK }]}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>帮助中心</Text>
            <Text style={styles.headerSubtitle}>解答您的疑问</Text>
          </View>

          {/* 操作指南卡片 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>操作指南</Text>
            <View style={styles.guideGrid}>
              {GUIDE_DATA.map((guide) => (
                <TouchableOpacity 
                  key={guide.id} 
                  style={styles.guideCard}
                  onPress={() => toggleExpand(guide.id)}
                >
                  <View style={[styles.guideIcon, { backgroundColor: guide.color + '20' }]}>
                    <Ionicons name={guide.icon as any} size={24} color={guide.color} />
                  </View>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                  <Text style={styles.guideDesc}>{guide.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 常见问题 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>常见问题</Text>
            {FAQ_DATA.map((faq) => (
              <TouchableOpacity
                key={faq.id}
                style={[
                  styles.faqItem,
                  expandedId === faq.id && styles.faqItemExpanded,
                ]}
                onPress={() => toggleExpand(faq.id)}
                activeOpacity={0.7}
              >
                <View style={styles.faqHeader}>
                  <View style={styles.faqQuestion}>
                    <Ionicons 
                      name="help-circle" 
                      size={18} 
                      color={expandedId === faq.id ? YELLOW : TEXT_MUTED} 
                    />
                    <Text style={[
                      styles.faqQuestionText,
                      expandedId === faq.id && styles.faqQuestionTextActive,
                    ]}>
                      {faq.question}
                    </Text>
                  </View>
                  <Ionicons 
                    name={expandedId === faq.id ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={TEXT_MUTED} 
                  />
                </View>
                {expandedId === faq.id && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* 联系客服 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>联系客服</Text>
            <View style={styles.contactCard}>
              <TouchableOpacity style={styles.contactItem} onPress={openTelegram}>
                <View style={[styles.contactIcon, { backgroundColor: '#0088cc20' }]}>
                  <Ionicons name="send" size={20} color="#0088cc" />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>Telegram 官方群</Text>
                  <Text style={styles.contactValue}>@deepquest</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={TEXT_MUTED} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactItem} onPress={openTwitter}>
                <View style={[styles.contactIcon, { backgroundColor: '#1DA1F220' }]}>
                  <Ionicons name="at" size={20} color="#1DA1F2" />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>Twitter</Text>
                  <Text style={styles.contactValue}>@deepquest</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 安全提示 */}
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#FFA500" />
              <Text style={styles.warningTitle}>安全提示</Text>
            </View>
            <Text style={styles.warningText}>
              1. 官方团队不会主动私信索要您的密钥或密码{'\n'}
              2. 请通过官方渠道下载应用，警惕钓鱼网站{'\n'}
              3. 建议启用钱包的多重签名功能提升安全性{'\n'}
              4. 如遇可疑情况，请立即联系官方客服核实
            </Text>
          </View>

          {/* 版本信息 */}
          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>DeepQuest v1.0.0</Text>
            <Text style={styles.versionText}>BSC Chain</Text>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_WHITE,
  },
  headerSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 12,
  },
  guideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  guideCard: {
    width: '47%',
    backgroundColor: BG_CARD_SOLID,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    padding: 16,
  },
  guideIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_WHITE,
    marginBottom: 4,
  },
  guideDesc: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  faqItem: {
    backgroundColor: BG_CARD_SOLID,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    marginBottom: 8,
    overflow: 'hidden',
  },
  faqItemExpanded: {
    borderColor: YELLOW + '50',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  faqQuestionText: {
    fontSize: 14,
    color: TEXT_MUTED,
    flex: 1,
  },
  faqQuestionTextActive: {
    color: YELLOW,
    fontWeight: '500',
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  faqAnswerText: {
    fontSize: 13,
    color: TEXT_WHITE,
    lineHeight: 22,
  },
  contactCard: {
    backgroundColor: BG_CARD_SOLID,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    overflow: 'hidden',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GRAY,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_WHITE,
  },
  contactValue: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  warningCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: BG_CARD_SOLID,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFA50030',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA500',
  },
  warningText: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 22,
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  versionText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
});
