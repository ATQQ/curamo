import { createI18n } from 'vue-i18n'
import zhCN from '../locales/zh-CN.json'
import enUS from '../locales/en-US.json'

// Type-define 'en-US' as the master schema for the resource
type MessageSchema = typeof zhCN

const i18n = createI18n<[MessageSchema], 'zh-CN' | 'en-US'>({
  legacy: false, // you must set `false`, to use Composition API
  locale: 'zh-CN', // set locale
  fallbackLocale: 'en-US', // set fallback locale
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

export default i18n
