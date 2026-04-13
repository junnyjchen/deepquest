import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_LANGUAGE, LANGUAGES, t as translate } from '@/i18n';

const LANGUAGE_STORAGE_KEY = '@deepquest_language';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: (path: string) => string;
  languages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);

  // 加载保存的语言设置
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && LANGUAGES.some(l => l.code === savedLanguage)) {
          setLanguageState(savedLanguage);
        }
      } catch (error) {
        console.error('加载语言设置失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLanguage();
  }, []);

  // 设置语言
  const setLanguage = useCallback(async (lang: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('保存语言设置失败:', error);
    }
  }, []);

  // 翻译函数
  const t = useCallback((path: string) => {
    return translate(language, path);
  }, [language]);

  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
