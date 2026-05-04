import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { Screen } from '@/components/Screen';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export default function NodeCSVImport() {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [csvContent, setCsvContent] = useState('');

  const parseCSV = (content: string) => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV 文件至少需要包含标题行和一行数据');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // 检查必需字段
    if (!headers.includes('wallet_address')) {
      throw new Error('CSV 必须包含 wallet_address 字段');
    }
    if (!headers.includes('level')) {
      throw new Error('CSV 必须包含 level 字段');
    }

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      
      // 验证数据
      if (!row.wallet_address) {
        throw new Error(`第 ${i + 1} 行：钱包地址不能为空`);
      }
      if (!row.level || isNaN(parseInt(row.level))) {
        throw new Error(`第 ${i + 1} 行：level 必须是数字`);
      }
      
      data.push(row);
    }
    
    return data;
  };

  const handleCSVImport = async () => {
    if (!csvContent.trim()) {
      Alert.alert('错误', '请输入或粘贴 CSV 内容');
      return;
    }

    try {
      setImporting(true);
      const nodes = parseCSV(csvContent);

      // 调用后端 API
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/nodes/csv-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodes }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        setIsSuccess(true);
        setModalMessage(`导入完成！\n\n总记录：${data.total}\n成功：${data.success}\n失败：${data.failed}`);
      } else {
        setResult(data);
        setIsSuccess(false);
        setModalMessage(`导入失败：${data.error || '未知错误'}`);
      }
      setShowModal(true);
    } catch (error: any) {
      setIsSuccess(false);
      setModalMessage(`解析错误：${error.message}`);
      setShowModal(true);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>CSV 批量导入节点</Text>
        
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>CSV 格式要求：</Text>
          <Text style={styles.instructionsText}>
            1. 第一行必须包含：wallet_address, parent_address, level{'\n'}
            2. wallet_address：用户钱包地址（必填）{'\n'}
            3. parent_address：推荐人地址（可为空）{'\n'}
            4. level：卡牌等级 1=A, 2=B, 3=C（必填）
          </Text>
        </View>

        <View style={styles.exampleBox}>
          <Text style={styles.exampleTitle}>示例 CSV：</Text>
          <Text style={styles.exampleText}>
            wallet_address,parent_address,level{'\n'}
            0x1234567890123456789012345678901234567890,0xabcdef1234567890abcdef1234567890abcdef12,1{'\n'}
            0xabcdef1234567890abcdef1234567890abcdef12,,2
          </Text>
        </View>

        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={15}
          placeholder="在此粘贴 CSV 内容..."
          value={csvContent}
          onChangeText={setCsvContent}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.importButton, importing && styles.buttonDisabled]}
          onPress={handleCSVImport}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>导入到链上</Text>
          )}
        </TouchableOpacity>

        {result && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>导入结果</Text>
            <Text style={styles.resultText}>总记录：{result.total}</Text>
            <Text style={styles.resultSuccess}>成功：{result.success}</Text>
            <Text style={styles.resultFailed}>失败：{result.failed}</Text>
            {result.errors.length > 0 && (
              <>
                <Text style={styles.resultErrorTitle}>错误详情：</Text>
                {result.errors.slice(0, 10).map((err, i) => (
                  <Text key={i} style={styles.resultErrorText}>{err}</Text>
                ))}
                {result.errors.length > 10 && (
                  <Text style={styles.resultErrorText}>...还有 {result.errors.length - 10} 条错误</Text>
                )}
              </>
            )}
          </View>
        )}

        <Modal
          visible={showModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={[styles.modalTitle, isSuccess ? styles.successText : styles.errorText]}>
                {isSuccess ? '导入完成' : '导入失败'}
              </Text>
              <Text style={styles.modalMessage}>{modalMessage}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalButtonText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  instructions: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  exampleBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 200,
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  importButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultSuccess: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
  },
  resultFailed: {
    fontSize: 14,
    color: '#f44336',
    marginBottom: 8,
  },
  resultErrorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
    marginTop: 8,
    marginBottom: 4,
  },
  resultErrorText: {
    fontSize: 12,
    color: '#f44336',
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#f44336',
  },
  modalMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
