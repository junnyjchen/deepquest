import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Screen } from '@/components/Screen';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { nodesApi } from '@/utils/api';

// Web 端读取文件内容
async function readFileContent(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    // Web 端使用 fetch + blob 方式
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  } else {
    // 原生端使用 expo-file-system
    return (FileSystem as any).readAsStringAsync(uri);
  }
}
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface CsvRow {
  wallet_address: string;
  parent_address?: string;
  level?: number;
}

export default function NodeCsvImportScreen() {
  const [csvData, setCsvData] = useState<string>('');
  const [parsedData, setParsedData] = useState<CsvRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { admin } = useAdminAuth();

  const handlePickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      console.log('[CSV] 文件选择成功:', file.name, file.uri);
      
      const content = await readFileContent(file.uri);
      console.log('[CSV] 文件内容长度:', content.length);
      console.log('[CSV] 文件前200字符:', content.substring(0, 200));
      
      setCsvData(content);
      setResults(null);

      // 解析 CSV
      const { valid, errors } = parseCsvData(content);
      console.log('[CSV] 解析结果:', { validCount: valid.length, errorCount: errors.length, errors });
      
      setParsedData(valid);
      setDebugInfo(`解析: ${valid.length} 条数据, ${errors.length} 个错误`);
      
      if (errors.length > 0) {
        Alert.alert('解析警告', `部分数据有问题:\n${errors.slice(0, 5).join('\n')}`);
      }
    } catch (error: any) {
      console.error('[CSV] 读取文件失败:', error);
      Alert.alert('错误', `读取文件失败: ${error.message}`);
    }
  }, []);

  const parseCsvData = useCallback((csv: string) => {
    const lines = csv.trim().split('\n');
    console.log('[CSV] 总行数:', lines.length);
    
    if (lines.length < 2) {
      return { valid: [], errors: ['CSV 文件为空或只有表头'] };
    }

    // 解析表头（支持多种命名）
    const headerLine = lines[0].toLowerCase();
    console.log('[CSV] 表头:', headerLine);
    
    const walletIdx = headerLine.indexOf('wallet_address');
    const parentIdx = headerLine.indexOf('parent_address');
    const levelIdx = headerLine.indexOf('level');
    const cardTypeIdx = headerLine.indexOf('card_type');
    
    const actualLevelIdx = levelIdx !== -1 ? levelIdx : cardTypeIdx;
    
    console.log('[CSV] 列索引:', { walletIdx, parentIdx, levelIdx: actualLevelIdx });

    if (walletIdx === -1) {
      return { valid: [], errors: ['CSV 必须包含 wallet_address 列'] };
    }

    const valid: CsvRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map((v: string) => v.trim());
      
      // 提取钱包地址
      const wallet = walletIdx !== -1 ? values[walletIdx] : undefined;
      
      if (!wallet) {
        errors.push(`第 ${i + 1} 行: 缺少钱包地址`);
        continue;
      }
      
      if (!wallet.startsWith('0x') || wallet.length !== 42) {
        errors.push(`第 ${i + 1} 行: 无效的钱包地址 "${wallet}"`);
        continue;
      }

      // 提取推荐人地址（可选）
      const parent_address = parentIdx !== -1 ? values[parentIdx] : undefined;
      
      // 提取节点等级（可选）
      let level: number | undefined;
      if (actualLevelIdx !== -1 && values[actualLevelIdx]) {
        const levelStr = values[actualLevelIdx].trim();
        if (levelStr) {
          const parsedLevel = parseInt(levelStr, 10);
          if (isNaN(parsedLevel) || parsedLevel < 1 || parsedLevel > 3) {
            errors.push(`第 ${i + 1} 行: 无效的等级 "${levelStr}"`);
          } else {
            level = parsedLevel;
          }
        }
      }

      valid.push({
        wallet_address: wallet,
        parent_address: parent_address || undefined,
        level,
      });
    }

    return { valid, errors };
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (csvData.length === 0) {
      Alert.alert('错误', '请先选择 CSV 文件');
      return;
    }

    if (parsedData.length === 0) {
      Alert.alert('错误', '没有有效数据可导入');
      return;
    }

    // 统计带等级和不带等级的数量
    const withLevel = parsedData.filter(r => r.level !== undefined).length;
    const withoutLevel = parsedData.filter(r => r.level === undefined).length;

    Alert.alert(
      '确认导入',
      `确定要导入 ${parsedData.length} 个节点吗？\n\n` +
      `• 带节点等级: ${withLevel} 个\n` +
      `• 无节点等级: ${withoutLevel} 个\n\n` +
      `（无节点等级的用户只创建绑定关系，不设置等级）`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定导入',
          onPress: async () => {
            setLoading(true);
            try {
              console.log('[CSV] 开始导入:', parsedData);
              const result = await nodesApi.importCsv(parsedData);
              console.log('[CSV] 导入结果:', result);
              setResults(result);
            } catch (error: any) {
              console.error('[CSV] 导入失败:', error);
              Alert.alert('导入失败', error.message || '服务器错误');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [csvData, parsedData]);

  // 调试信息显示
  useEffect(() => {
    console.log('[CSV] parsedData 更新:', parsedData.length);
  }, [parsedData]);

  return (
    <Screen>
      <View className="flex-1 p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">CSV 批量导入节点</Text>
        <Text className="text-sm text-gray-500 mb-6">一步到位：创建用户 + 绑定关系 + 节点等级（可选）</Text>

        {/* 调试信息 */}
        {debugInfo ? (
          <View className="bg-yellow-50 rounded-lg p-2 mb-4">
            <Text className="text-xs text-yellow-700">{debugInfo}</Text>
          </View>
        ) : null}

        {/* CSV 文件选择 */}
        <TouchableOpacity
          className="bg-white rounded-xl p-6 mb-4 shadow-sm items-center border-2 border-dashed border-blue-300"
          onPress={handlePickDocument}
        >
          <Text className="text-blue-600 font-semibold">点击选择 CSV 文件</Text>
          <Text className="text-gray-500 text-sm mt-1">
            支持 .csv 格式，编码 UTF-8
          </Text>
        </TouchableOpacity>

        {/* CSV 格式说明 */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-semibold text-gray-800 mb-2">CSV 格式说明</Text>
          <View className="bg-gray-50 rounded-lg p-3">
            <Text className="text-sm text-gray-600 font-mono">
              wallet_address,parent_address,level{'\n'}
              0x用户地址1,0x推荐人地址,1{'\n'}
              0x用户地址2,,2{'\n'}
              0x用户地址3,0x推荐人地址,{'\n'}
              0x用户地址4,,{'\n'}
            </Text>
          </View>
          <View className="mt-3 space-y-1">
            <Text className="text-sm text-gray-600">• <Text className="font-semibold">wallet_address</Text>: 钱包地址（必填）</Text>
            <Text className="text-sm text-gray-600">• <Text className="font-semibold">parent_address</Text>: 推荐人地址（可选）</Text>
            <Text className="text-sm text-gray-600">• <Text className="font-semibold">level</Text>: 节点等级 1=A, 2=B, 3=C（可选，留空则不设置等级）</Text>
          </View>
        </View>

        {/* 预览数据 */}
        {parsedData.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-semibold text-gray-800 mb-2">
              预览数据 ({parsedData.length} 条)
            </Text>
            <View className="flex-row gap-2 mb-2">
              <View className="bg-green-50 rounded-lg px-3 py-1">
                <Text className="text-sm text-green-700">
                  带等级: {parsedData.filter(r => r.level).length}
                </Text>
              </View>
              <View className="bg-gray-100 rounded-lg px-3 py-1">
                <Text className="text-sm text-gray-600">
                  无等级: {parsedData.filter(r => !r.level).length}
                </Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View className="flex-row bg-gray-100 rounded-t-lg">
                  <Text className="w-36 p-2 text-sm font-medium">钱包地址</Text>
                  <Text className="w-36 p-2 text-sm font-medium">推荐人地址</Text>
                  <Text className="w-20 p-2 text-sm font-medium">等级</Text>
                </View>
                {parsedData.slice(0, 10).map((row, idx) => (
                  <View
                    key={idx}
                    className={`flex-row ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <Text className="w-36 p-2 text-xs" numberOfLines={1}>
                      {row.wallet_address}
                    </Text>
                    <Text className="w-36 p-2 text-xs" numberOfLines={1}>
                      {row.parent_address || '-'}
                    </Text>
                    <Text className={`w-20 p-2 text-xs ${row.level ? 'text-green-600' : 'text-gray-400'}`}>
                      {row.level || '-'}
                    </Text>
                  </View>
                ))}
                {parsedData.length > 10 && (
                  <Text className="p-2 text-xs text-gray-500">
                    ... 还有 {parsedData.length - 10} 条数据
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* 导入结果 */}
        {results && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-semibold text-gray-800 mb-3">导入结果</Text>
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-green-50 rounded-lg p-3 items-center">
                <Text className="text-2xl font-bold text-green-600">
                  {results.data?.success || 0}
                </Text>
                <Text className="text-sm text-green-600">成功</Text>
              </View>
              <View className="flex-1 bg-blue-50 rounded-lg p-3 items-center">
                <Text className="text-2xl font-bold text-blue-600">
                  {results.data?.created || 0}
                </Text>
                <Text className="text-sm text-blue-600">新建</Text>
              </View>
              <View className="flex-1 bg-purple-50 rounded-lg p-3 items-center">
                <Text className="text-2xl font-bold text-purple-600">
                  {results.data?.updated || 0}
                </Text>
                <Text className="text-sm text-purple-600">更新</Text>
              </View>
              <View className="flex-1 bg-red-50 rounded-lg p-3 items-center">
                <Text className="text-2xl font-bold text-red-600">
                  {results.data?.failed || 0}
                </Text>
                <Text className="text-sm text-red-600">失败</Text>
              </View>
            </View>
            
            {/* 等级统计 */}
            {(results.data?.withLevel > 0 || results.data?.withoutLevel > 0) && (
              <View className="flex-row gap-3 mb-3">
                <View className="flex-1 bg-green-50 rounded-lg p-2 items-center">
                  <Text className="text-lg font-bold text-green-600">
                    {results.data?.withLevel || 0}
                  </Text>
                  <Text className="text-xs text-green-600">带等级</Text>
                </View>
                <View className="flex-1 bg-gray-100 rounded-lg p-2 items-center">
                  <Text className="text-lg font-bold text-gray-600">
                    {results.data?.withoutLevel || 0}
                  </Text>
                  <Text className="text-xs text-gray-600">无等级</Text>
                </View>
              </View>
            )}
            
            {results.data?.errors?.length > 0 && (
              <View className="bg-red-50 rounded-lg p-3">
                <Text className="text-sm text-red-600 font-medium">失败详情:</Text>
                {results.data.errors.slice(0, 5).map((err: string, idx: number) => (
                  <Text key={idx} className="text-xs text-red-500 mt-1">
                    {err}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 导入按钮 */}
        <TouchableOpacity
          className={`rounded-xl p-4 items-center ${
            loading || parsedData.length === 0
              ? 'bg-gray-300'
              : 'bg-blue-500'
          }`}
          onPress={handleConfirmImport}
          disabled={loading || parsedData.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">
              {parsedData.length > 0
                ? `导入 ${parsedData.length} 个节点`
                : '请先选择 CSV 文件'}
            </Text>
          )}
        </TouchableOpacity>

        <View className="h-8" />
      </View>
    </Screen>
  );
}
