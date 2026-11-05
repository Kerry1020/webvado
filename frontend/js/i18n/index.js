/**
 * I18n - 国际化管理器
 */

import en_US from './en_US.js';
import zh_CN from './zh_CN.js';

class I18n {
  constructor() {
    this.locales = {
      'en-US': en_US,
      'zh-CN': zh_CN
    };
    
    // 从 localStorage 读取，默认英文；存了不认识的值就回退英文
    const saved = localStorage.getItem('webvado-locale');
    this.currentLocale = this.locales[saved] ? saved : 'en-US';
  }

  /**
   * 获取翻译文本
   * @param {string} key - 键路径，如 'menu.file' 或 'dialog.newProject.title'
   * @param {object} params - 替换参数，如 {name: 'test'}
   */
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.locales[this.currentLocale];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        console.warn(`[I18n] Missing translation: ${key} for locale ${this.currentLocale}`);
        return key;
      }
    }
    
    if (typeof value !== 'string') {
      console.warn(`[I18n] Invalid translation value for: ${key}`);
      return key;
    }
    
    // 替换参数
    return value.replace(/\{(\w+)\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }

  /**
   * 切换语言
   */
  setLocale(locale) {
    if (!this.locales[locale]) {
      console.error(`[I18n] Locale not found: ${locale}`);
      return false;
    }
    
    this.currentLocale = locale;
    localStorage.setItem('webvado-locale', locale);
    
    // 触发语言切换事件
    window.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
    
    return true;
  }

  /**
   * 翻译页面上所有带 data-i18n / data-i18n-placeholder / data-i18n-title 的元素
   */
  apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = this.t(el.dataset.i18nPlaceholder);
    });
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = this.t(el.dataset.i18nTitle);
      el.setAttribute('aria-label', el.title);
    });
    document.documentElement.lang = this.currentLocale;
  }

  /**
   * 获取当前语言
   */
  getLocale() {
    return this.currentLocale;
  }

  /**
   * 获取可用语言列表
   */
  getAvailableLocales() {
    return [
      { code: 'en-US', name: 'English' },
      { code: 'zh-CN', name: '简体中文' }
    ];
  }
}

// 单例
const i18n = new I18n();

export default i18n;
