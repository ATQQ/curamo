<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Settings, Globe, Moon, Sun, Monitor, Cpu, Server, Database, Languages, FileText, Plus, Trash2, Edit2, Save, X, MessageSquare } from 'lucide-vue-next'
import client from '@/api/client'

const { locale, t } = useI18n()
const activeTab = ref('general')
const defaultTemplateId = ref('')

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
  const { data } = await client.settings.get()
  if (data && Array.isArray(data)) {
    const langSetting = data.find((s: any) => s.key === 'target_language')
    if (langSetting) targetLanguage.value = langSetting.value

    const defaultTemplateSetting = data.find((s: any) => s.key === 'default_template_id')
    if (defaultTemplateSetting) defaultTemplateId.value = defaultTemplateSetting.value
  }
}

const templates = ref<any[]>([])
const isEditingTemplate = ref(false)
const currentTemplate = ref<any>({
  name: '',
  contentPattern: '',
  prompt: ''
})

const fetchTemplates = async () => {
  try {
    const { data } = await client.templates.get()
    if (data) {
      templates.value = data
    }
  } catch (err) {
    console.error('Failed to fetch templates:', err)
  }
}

const saveTemplate = async () => {
  try {
    if (currentTemplate.value.id) {
      await client.templates({ id: currentTemplate.value.id }).put({
        name: currentTemplate.value.name,
        contentPattern: currentTemplate.value.contentPattern,
        prompt: currentTemplate.value.prompt
      })
    } else {
      await client.templates.post({
        name: currentTemplate.value.name,
        contentPattern: currentTemplate.value.contentPattern,
        prompt: currentTemplate.value.prompt
      })
    }
    isEditingTemplate.value = false
    fetchTemplates()
  } catch (err) {
    console.error('Failed to save template:', err)
  }
}

const deleteTemplate = async (id: string) => {
  if (confirm(t('common.confirmDelete') || 'Are you sure?')) {
    try {
      await (client as any).templates({ id }).delete()
      fetchTemplates()
    } catch (err) {
      console.error('Failed to delete template:', err)
    }
  }
}

const editTemplate = (template: any) => {
  currentTemplate.value = { ...template }
  isEditingTemplate.value = true
}

const createTemplate = () => {
  currentTemplate.value = {
    name: '',
    contentPattern: '## Summary\n\n- Point 1\n- Point 2',
    prompt: ''
  }
  isEditingTemplate.value = true
}

const cancelEdit = () => {
  isEditingTemplate.value = false
}

const saveDefaultTemplate = async () => {
  await client.settings.put({
    key: 'default_template_id',
    value: defaultTemplateId.value
  })
}

const saveTargetLanguage = async (lang: string) => {
  targetLanguage.value = lang
  await client.settings.put({
    key: 'target_language',
    value: lang
  })
}

onMounted(() => {
  fetchSettings()
  fetchTemplates()
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
        <button 
          @click="activeTab = 'templates'"
          class="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
          :class="activeTab === 'templates' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'"
        >
          <FileText class="mr-3 h-4 w-4" />
          {{ t('settings.templates') || 'Templates' }}
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

        <!-- Template Settings -->
        <div v-if="activeTab === 'templates'" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 class="text-lg font-medium text-slate-900">{{ t('settings.summaryTemplates') || 'Summary Templates' }}</h2>
                <p class="text-sm text-slate-500 mt-1">{{ t('settings.manageTemplates') || 'Manage your AI summary templates' }}</p>
              </div>
              <Button v-if="!isEditingTemplate" @click="createTemplate" size="sm" class="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus class="h-4 w-4 mr-2" />
                {{ t('common.create') || 'Create' }}
              </Button>
            </div>
            
            <div class="p-6">
              <!-- List Mode -->
              <div v-if="!isEditingTemplate" class="space-y-4">
                <div v-if="templates.length > 0" class="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 class="text-sm font-medium text-slate-900">{{ t('settings.defaultTemplate') || 'Default Template' }}</h3>
                    <p class="text-xs text-slate-500">{{ t('settings.defaultTemplateDesc') || 'This template will be pre-selected when summarizing articles.' }}</p>
                  </div>
                  <select v-model="defaultTemplateId" @change="saveDefaultTemplate" class="w-full sm:w-auto min-w-[200px] rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white">
                    <option value="">{{ t('common.none') || 'None (Default)' }}</option>
                    <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                </div>

                <div v-if="templates.length === 0" class="text-center py-8 text-slate-500">
                  {{ t('settings.noTemplates') || 'No templates found. Create one to get started.' }}
                </div>
                <div v-else class="grid gap-4">
                  <div v-for="template in templates" :key="template.id" class="flex items-start justify-between p-4 rounded-lg border border-slate-200 hover:border-emerald-200 hover:bg-slate-50 transition-all">
                    <div>
                      <h3 class="font-medium text-slate-900">{{ template.name }}</h3>
                      <p class="text-xs text-slate-500 mt-1 line-clamp-1">{{ template.contentPattern }}</p>
                      <div v-if="template.prompt" class="mt-2 flex items-center text-xs text-emerald-600">
                        <MessageSquare class="h-3 w-3 mr-1" />
                        {{ t('settings.hasCustomPrompt') || 'Has custom prompt' }}
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <Button variant="ghost" size="icon" @click="editTemplate(template)" class="h-8 w-8 text-slate-400 hover:text-emerald-600">
                        <Edit2 class="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" @click="deleteTemplate(template.id)" class="h-8 w-8 text-slate-400 hover:text-red-600">
                        <Trash2 class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Edit Mode -->
              <div v-else class="space-y-4">
                <div class="space-y-3">
                  <label class="block text-sm font-medium text-slate-700">{{ t('common.name') || 'Name' }}</label>
                  <input v-model="currentTemplate.name" type="text" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="e.g. Detailed Summary" />
                </div>

                <div class="space-y-3">
                  <label class="block text-sm font-medium text-slate-700">{{ t('settings.markdownTemplate') || 'Markdown Template' }}</label>
                  <textarea v-model="currentTemplate.contentPattern" rows="6" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="## Title..."></textarea>
                  <p class="text-xs text-slate-500">The structure the AI should follow.</p>
                </div>

                <div class="space-y-3">
                  <label class="block text-sm font-medium text-slate-700">{{ t('settings.aiPrompt') || 'AI Instructions (Optional)' }}</label>
                  <textarea v-model="currentTemplate.prompt" rows="3" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="e.g. Focus on technical details..."></textarea>
                  <p class="text-xs text-slate-500">Extra instructions for the AI.</p>
                </div>

                <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button variant="ghost" @click="cancelEdit">{{ t('common.cancel') || 'Cancel' }}</Button>
                  <Button @click="saveTemplate" class="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Save class="h-4 w-4 mr-2" />
                    {{ t('common.save') || 'Save' }}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
