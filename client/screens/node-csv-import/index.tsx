import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Screen } from '@/components/Screen';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { nodesApi } from '@/utils/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';

type ImportMode = 'create' | 'level';

export default function NodeCsvImportScreen() {
  const [csvData, setCsvData] = useState<string>('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('create');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
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
      const content = await (FileSystem as any).readAsStringAsync(file.uri);
      setCsvData(content);
      setResults(null);

      const { valid } = parseCsvData(content);
      setParsedData(valid);
    } catch (error: any) {
      Alert.alert('错误', `读取文件失败: ${error.message}`);
    }
  }, []);

  const parseCsvData = useCallback((csv: string) => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) {
      return { valid: [], errors: ['CSV 文件为空或格式错误'] };
    }

    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    const walletIdx = headers.indexOf('wallet_address');
    const parentIdx = headers.indexOf('parent_address');
    const levelIdx = headers.indexOf('level');

    if (walletIdx === -1) {
      return { valid: [], errors: ['CSV 必须包含 wallet_address 列'] };
    }

    const valid: { wallet_address: string; parent_address: string; level: number }[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v: string) => v.trim());
      const wallet = values[walletIdx];
      const levelStr = levelIdx !== -1 ? values[levelIdx] : '1';
      const level = parseInt(levelStr, 10);

      if (!wallet || !wallet.startsWith('0x')) {
        errors.push(`第 ${i + 1} 行: 无效的钱包地址`);
        continue;
      }

      if (isNaN(level) || level < 1 || level > 3) {
        errors.push(`第 ${i + 1} 行: 无效的等级`);
        continue;
      }

      valid.push({
        wallet_address: wallet,
        parent_address: parentIdx !== -1 ? values[parentIdx] : '',
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

    const { valid, errors } = parseCsvData(csvData);
    if (valid.length === 0) {
      Alert.alert('错误', '没有有效数据可导入');
      return;
    }

    const modeText = importMode === 'create' ? '创建用户并绑定关系' : '设置用户节点等级';
    Alert.alert(
      '确认导入',
      `确定要 ${modeText} 吗？\n共 ${valid.length} 条数据`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            setLoading(true);
            try {
              const result = importMode === 'create'
                ? await nodesApi.importCsvUsers(valid)
                : await nodesApi.importCsvLevels(valid);
              setResults(result);
            } catch (error: any) {
              Alert.alert('错误', error.message || '导入失败');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [csvData, importMode, parseCsvData]);

  return (
    <Screen>
      <View className="flex-1 p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-6">CSV 批量导入节点</Text>

        {/* 导入模式选择 */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-semibold text-gray-800 mb-3">导入模式</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 p-3 rounded-lg border-2 ${
                importMode === 'create'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
              onPress={() => setImportMode('create')}
            >
              <Text
                className={`text-center font-medium ${
                  importMode === 'create' ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                创建用户 + 绑定关系
              </Text>
              <Text className="text-xs text-gray-500 text-center mt-1">
                在链上创建用户并绑定推荐关系
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 p-3 rounded-lg border-2 ${
                importMode === 'level'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white'
              }`}
              onPress={() => setImportMode('level')}
            >
              <Text
                className={`text-center font-medium ${
                  importMode === 'level' ? 'text-purple-600' : 'text-gray-600'
                }`}
              >
                设置节点等级
              </Text>
              <Text className="text-xs text-gray-500 text-center mt-1">
                批量设置用户的节点卡牌等级
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CSV 文件选择 */}
        <TouchableOpacity
          className="bg-white rounded-xl p-6 mb-4 shadow-sm items-center"
          onPress={handlePickDocument}
        >
          <Text className="text-gray-700 font-medium">点击选择 CSV 文件</Text>
          <Text className="text-gray-500 text-sm mt-1">
            支持 .csv 格式，编码 UTF-8
          </Text>
        </TouchableOpacity>

        {/* CSV 格式说明 */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-semibold text-gray-800 mb-2">CSV 格式要求</Text>
          <View className="bg-gray-50 rounded-lg p-3">
            <Text className="text-sm text-gray-600 font-mono">
              wallet_address,parent_address,level{'\n'}
              0x用户地址1,0x推荐人地址,1{'\n'}
              0x用户地址2,0x推荐人地址,2{'\n'}
              0x用户地址3,,3
            </Text>
          </View>
          <View className="mt-3">
            <Text className="text-sm text-gray-600">• wallet_address: 钱包地址（必填）</Text>
            <Text className="text-sm text-gray-600">• parent_address: 推荐人地址（可选）</Text>
            <Text className="text-sm text-gray-600">• level: 节点等级 1=A, 2=B, 3=C</Text>
          </View>
        </View>

        {/* 预览数据 */}
        {parsedData.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-semibold text-gray-800 mb-2">
              预览数据 ({parsedData.length} 条)
            </Text>
            <View><ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View className="flex-row bg-gray-100 rounded-t-lg">
                  <Text className="w-32 p-2 text-sm font-medium">钱包地址</Text>
                  <Text className="w-32 p-2 text-sm font-medium">推荐人地址</Text>
                  <Text className="w-20 p-2 text-sm font-medium">等级</Text>
                </View>
                {parsedData.slice(0, 5).map((row, idx) => (
                  <View
                    key={idx}
                    className={`flex-row ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <Text className="w-32 p-2 text-xs" numberOfLines={1}>
                      {row.wallet_address}
                    </Text>
                    <Text className="w-32 p-2 text-xs" numberOfLines={1}>
                      {row.parent_address || '-'}
                    </Text>
                    <Text className="w-20 p-2 text-xs">{row.level}</Text>
                  </View>
                ))}
                {parsedData.length > 5 && (
                  <Text className="p-2 text-xs text-gray-500">
                    ... 还有 {parsedData.length - 5} 条数据
                  </Text>
                )}
              </View>
            </ScrollView></View>
          </View>
        )}

        {/* 导入结果 */}
        {results && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-semibold text-gray-800 mb-2">导入结果</Text>
            <View className="flex-row gap-4">
              <View className="flex-1 bg-green-50 rounded-lg p-3 items-center">
                <Text className="text-2xl font-bold text-green-600">
                  {results.success?.length || 0}
                </Text>
                <Text className="text-sm text-green-600">成功</Text>
              </View>
              <View className="flex-1 bg-red-50 rounded-lg p-3 items-center">
                <Text className="text-2xl font-bold text-red-600">
                  {results.failed?.length || 0}
                </Text>
                <Text className="text-sm text-red-600">失败</Text>
              </View>
            </View>
            {results.failed?.length > 0 && (
              <View className="mt-3 bg-red-50 rounded-lg p-3">
                <Text className="text-sm text-red-600 font-medium">失败详情:</Text>
                {results.failed.slice(0, 5).map((item: any, idx: number) => (
                  <Text key={idx} className="text-xs text-red-500 mt-1">
                    {item.wallet || item.address}: {item.error}
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
              : importMode === 'create'
              ? 'bg-blue-500'
              : 'bg-purple-500'
          }`}
          onPress={handleConfirmImport}
          disabled={loading || parsedData.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">
              {parsedData.length > 0
                ? `导入 ${parsedData.length} 条数据`
                : '请先选择 CSV 文件'}
            </Text>
          )}
        </TouchableOpacity>

        <View className="h-8" />
      </View>
    </Screen>
  );
}
