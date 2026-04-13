// i18n 配置文件
import zhTW from './zh-TW';
import zhCN from './zh-CN';
import en from './en';
import vi from './vi';
import ja from './ja';
import ko from './ko';

// 支持的语言
export const LANGUAGES = [
  { code: 'zh-TW', name: '繁體中文', nativeName: '繁體中文' },
  { code: 'zh-CN', name: '简体中文', nativeName: '简体中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'vi', name: 'Tiếng Việt', nativeName: 'Tiếng Việt' },
  { code: 'ja', name: '日本語', nativeName: '日本語' },
  { code: 'ko', name: '한국어', nativeName: '한국어' },
] as const;

// 语言包映射
const translations: Record<string, typeof zhTW> = {
  'zh-TW': zhTW,
  'zh-CN': zhCN,
  'en': en,
  'vi': vi,
  'ja': ja,
  'ko': ko,
};

// 默认语言
export const DEFAULT_LANGUAGE = 'zh-TW';

// 获取翻译文本
export function t(lang: string, path: string): string {
  const translation = translations[lang] || translations[DEFAULT_LANGUAGE];
  const keys = path.split('.');
  let result: any = translation;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      // 如果找不到，返回默认语言的对应值
      let defaultResult: any = translations[DEFAULT_LANGUAGE];
      for (const k of keys) {
        if (defaultResult && typeof defaultResult === 'object' && k in defaultResult) {
          defaultResult = defaultResult[k];
        } else {
          return path; // 返回路径作为后备
        }
      }
      return defaultResult;
    }
  }
  
  return typeof result === 'string' ? result : path;
}

// 导出所有语言包
export { zhTW, zhCN, en, vi, ja, ko };
