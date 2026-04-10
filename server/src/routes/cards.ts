import { getSupabaseClient } from '../storage/database/supabase-client';

const supabase = getSupabaseClient();

// 获取NFT卡牌列表
export async function getCards(params: {
  page?: number;
  pageSize?: number;
  cardType?: number;
  ownerAddress?: string;
  status?: string;
}) {
  const { page = 1, pageSize = 20, cardType, ownerAddress, status } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase
    .from('cards')
    .select('*', { count: 'exact' });
  
  if (cardType !== undefined && cardType !== null) {
    query = query.eq('card_type', cardType);
  }
  
  if (ownerAddress) {
    query = query.eq('owner_address', ownerAddress);
  }
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error, count } = await query
    .order('token_id', { ascending: true })
    .range(from, to);
  
  if (error) throw new Error(`获取卡牌列表失败: ${error.message}`);
  
  return {
    data,
    total: count || 0,
    page,
    pageSize,
  };
}

// 获取卡牌详情
export async function getCardByTokenId(tokenId: number) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('token_id', tokenId)
    .maybeSingle();
  
  if (error) throw new Error(`获取卡牌详情失败: ${error.message}`);
  return data;
}

// 批量发放卡牌（管理员操作）
export async function mintCards(cards: Array<{
  ownerAddress: string;
  cardType: number;
  mintPrice: string;
}>) {
  // 获取当前最大token_id
  const { data: maxToken, error: maxError } = await supabase
    .from('cards')
    .select('token_id')
    .order('token_id', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (maxError) throw new Error(`获取最大token_id失败: ${maxError.message}`);
  
  let nextTokenId = (maxToken?.token_id || 0) + 1;
  
  const insertData = cards.map((card, index) => ({
    token_id: nextTokenId + index,
    owner_address: card.ownerAddress,
    card_type: card.cardType,
    mint_price: card.mintPrice,
    status: 'active',
    minted_at: new Date().toISOString(),
  }));
  
  const { data, error } = await supabase
    .from('cards')
    .insert(insertData)
    .select();
  
  if (error) throw new Error(`批量发放卡牌失败: ${error.message}`);
  
  return data;
}

// 卡牌统计
export async function getCardStats() {
  const { count: totalCards, error: totalError } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true });
  
  if (totalError) throw new Error(`获取卡牌总数失败: ${totalError.message}`);
  
  // 按类型统计
  const { data: typeStats, error: typeError } = await supabase
    .from('cards')
    .select('card_type, status');
  
  if (typeError) throw new Error(`获取卡牌类型统计失败: ${typeError.message}`);
  
  const distribution: Record<string, { total: number; active: number }> = {
    '1': { total: 0, active: 0 },
    '2': { total: 0, active: 0 },
    '3': { total: 0, active: 0 },
  };
  
  for (const card of typeStats || []) {
    const key = String(card.card_type);
    if (distribution[key]) {
      distribution[key].total++;
      if (card.status === 'active') {
        distribution[key].active++;
      }
    }
  }
  
  return {
    totalCards: totalCards || 0,
    distribution,
  };
}
