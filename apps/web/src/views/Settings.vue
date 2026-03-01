<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Settings, Globe, Moon, Sun, Monitor, Cpu, Server, Database, Languages } from 'lucide-vue-next'
import client from '@/api/client'

const { locale, t } = useI18n()
const activeTab = ref('general')

const targetLanguage = ref('Chinese')
const targetLanguages = [
  { code: 'Chinese', name: '简体中文' },
  { code: 'English', name: 'English' },
  { code: 'Japanese', name: '日本語' },
  { code: 'French', name: 'Français' },
  { code: 'Spanish', name: 'Español' },
]

const languages = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'zh-CN', name: '简体中文' }
]

const fetchSettings = async () => {
  const { data } = await client.settings.index.get()
  if (data && Array.isArray(data)) {
    const langSetting = data.find((s: any) => s.key === 'target_language')
    if (langSetting) targetLanguage.value = langSetting.value
  }
}

const saveTargetLanguage = async (lang: string) => {
  targetLanguage.value = lang
  await client.settings.index.put({
    key: 'target_language',
    value: lang
  })
}

onMounted(() => {
  fetchSettings()
})

const themes = [
  { value: 'light', label: 'common.light', icon: Sun },
  { value: 'dark', label: 'common.dark', icon: Moon },
  { value: 'system', label: 'common.system', icon: Monitor }
]

const currentTheme = ref('light')

const setLanguage = (code: string) => {
  locale.value = code
  // In a real app, persist to localStorage
  localStorage.setItem('locale', code)
}

const setTheme = (theme: string) => {
  currentTheme.value = theme
  // In a real app, toggle dark mode class
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
  localStorage.setItem('theme', theme)
}
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">{{ t('settings.title') }}</h1>
      <p class="text-slate-500 mt-1">{{ t('settings.subtitle') }}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
      <!-- Sidebar Navigation -->
      <div class="md:col-span-1 space-y-1">
        <button 
          @click="activeTab = 'general'"
          class="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeTab === 'general' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
        >
          <Settings class="mr-3 h-4 w-4" />
          {{ t('settings.general') }}
        </button>
        <button 
          @click="activeTab = 'system'"
          class="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeTab === 'system' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
        >
          <Server class="mr-3 h-4 w-4" />
          {{ t('settings.system') }}
        </button>
      </div>

      <!-- Content Area -->
      <div class="md:col-span-3 space-y-6">
        <!-- General Settings -->
        <div v-if="activeTab === 'general'" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-6 border-b border-slate-100">
              <h2 class="text-lg font-medium text-slate-900">{{ t('settings.appearance') }}</h2>
              <p class="text-sm text-slate-500 mt-1">{{ t('settings.customizeLook') }}</p>
            </div>
            <div class="p-6 space-y-6">
              <div>
                <label class="text-sm font-medium text-slate-700 mb-3 block">{{ t('common.language') }}</label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div 
                    v-for="lang in languages" 
                    :key="lang.code"
                    @click="setLanguage(lang.code)"
                    class="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all"
                    :class="locale === lang.code ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'"
                  >
                    <div class="flex items-center">
                      <Globe class="h-4 w-4 text-slate-400 mr-3" />
                      <span class="text-sm font-medium text-slate-900">{{ lang.name }}</span>
                    </div>
                    <div v-if="locale === lang.code" class="h-2 w-2 rounded-full bg-emerald-500"></div>
                  </div>
                </div>
              </div>

              <div>
                <label class="text-sm font-medium text-slate-700 mb-3 block">{{ t('settings.targetLanguage') || 'Target Language for AI' }}</label>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div 
                    v-for="lang in targetLanguages" 
                    :key="lang.code"
                    @click="saveTargetLanguage(lang.code)"
                    class="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all"
                    :class="targetLanguage === lang.code ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'"
                  >
                    <div class="flex items-center">
                      <Languages class="h-4 w-4 text-slate-400 mr-3" />
                      <span class="text-sm font-medium text-slate-900">{{ lang.name }}</span>
                    </div>
                    <div v-if="targetLanguage === lang.code" class="h-2 w-2 rounded-full bg-emerald-500"></div>
                  </div>
                </div>
              </div>

              <div>
                <label class="text-sm font-medium text-slate-700 mb-3 block">{{ t('common.theme') }}</label>
                <div class="grid grid-cols-3 gap-3">
                  <div 
                    v-for="theme in themes" 
                    :key="theme.value"
                    @click="setTheme(theme.value)"
                    class="flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all text-center"
                    :class="currentTheme === theme.value ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'"
                  >
                    <component :is="theme.icon" class="h-5 w-5 mb-2" :class="currentTheme === theme.value ? 'text-emerald-600' : 'text-slate-400'" />
                    <span class="text-sm font-medium text-slate-900">{{ t(theme.label) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- System Settings -->
        <div v-if="activeTab === 'system'" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-6 border-b border-slate-100">
              <h2 class="text-lg font-medium text-slate-900">{{ t('settings.systemInfo') }}</h2>
              <p class="text-sm text-slate-500 mt-1">{{ t('settings.statusServices') }}</p>
            </div>
            <div class="p-6">
              <div class="space-y-4">
                <div class="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div class="flex items-center">
                    <div class="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center mr-3">
                      <Cpu class="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p class="text-sm font-medium text-slate-900">{{ t('settings.appVersion') }}</p>
                      <p class="text-xs text-slate-500">{{ t('settings.core') }}</p>
                    </div>
                  </div>
                  <span class="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">v0.1.0</span>
                </div>

                <div class="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div class="flex items-center">
                    <div class="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                      <Database class="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p class="text-sm font-medium text-slate-900">{{ t('settings.database') }}</p>
                      <p class="text-xs text-slate-500">{{ t('settings.turso') }}</p>
                    </div>
                  </div>
                  <span class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    {{ t('settings.connected') }}
                  </span>
                </div>

                <div class="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div class="flex items-center">
                    <div class="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
                      <Server class="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p class="text-sm font-medium text-slate-900">{{ t('settings.apiServer') }}</p>
                      <p class="text-xs text-slate-500">{{ t('settings.elysia') }}</p>
                    </div>
                  </div>
                  <span class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    {{ t('settings.running') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
