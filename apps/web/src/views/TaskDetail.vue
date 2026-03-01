<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Loader2, Sparkles, Save, FileText, ExternalLink } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import client from '@/api/client'
import MarkdownIt from 'markdown-it'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const md = new MarkdownIt()

const taskId = route.params.id as string

interface TaskItem {
  id: string
  article: {
    id: string
    title: string
    url: string
    sourceId: string
  }
}

interface Task {
  id: string
  title: string
  status: 'draft' | 'generated' | 'published'
  items: TaskItem[]
  latestSnapshot?: {
    content: string
    versionNote: string
    createdAt: string
  }
}

const task = ref<Task | null>(null)
const isLoading = ref(true)
const isGenerating = ref(false)
const isSaving = ref(false)
const editorContent = ref('')
const activeTab = ref<'write' | 'preview'>('write')

const fetchTask = async () => {
  try {
    const { data, error } = await client.tasks({ id: taskId }).get()
    if (error) throw error
    if (data) {
      task.value = data as any
      if (task.value?.latestSnapshot?.content) {
        editorContent.value = task.value.latestSnapshot.content
        if (task.value.status === 'generated' || task.value.status === 'published') {
            activeTab.value = 'preview'
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch task:', err)
  } finally {
    isLoading.value = false
  }
}

const handleGenerate = async () => {
  isGenerating.value = true
  try {
    const { data, error } = await client.tasks({ id: taskId }).generate.post()
    if (error) throw error
    if (data && (data as any).content) {
      editorContent.value = (data as any).content
      activeTab.value = 'preview'
      // Refresh task to update status
      fetchTask()
    }
  } catch (err) {
    console.error('Failed to generate content:', err)
  } finally {
    isGenerating.value = false
  }
}

const handleSave = async () => {
  isSaving.value = true
  try {
    const { error } = await client.tasks({ id: taskId }).content.put({
      content: editorContent.value,
      note: 'Manual save'
    })
    if (error) throw error
    // Success feedback
  } catch (err) {
    console.error('Failed to save content:', err)
  } finally {
    isSaving.value = false
  }
}

const parsedContent = computed(() => {
  return md.render(editorContent.value)
})

onMounted(() => {
  fetchTask()
})
</script>

<template>
  <div v-if="isLoading" class="flex items-center justify-center h-[50vh]">
    <Loader2 class="h-8 w-8 animate-spin text-slate-400" />
  </div>
  
  <div v-else-if="!task" class="text-center py-12">
    <h3 class="text-lg font-medium text-slate-900">{{ t('taskDetail.notFound') }}</h3>
    <Button @click="router.push('/tasks')" variant="outline" class="mt-4">
      {{ t('taskDetail.backToTasks') }}
    </Button>
  </div>

  <div v-else class="space-y-6 h-[calc(100vh-10rem)] flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between shrink-0">
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" @click="router.push('/tasks')" class="h-8 w-8 -ml-2">
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">{{ task.title }}</h1>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-sm text-slate-500">
              {{ t('taskDetail.articlesSelected', { count: task.items.length }) }}
            </span>
            <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {{ t(`tasks.status.${task.status}`) }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <Button variant="outline" @click="handleSave" :disabled="isSaving || !editorContent">
          <Loader2 v-if="isSaving" class="mr-2 h-4 w-4 animate-spin" />
          <Save v-else class="mr-2 h-4 w-4" />
          {{ t('taskDetail.saveDraft') }}
        </Button>
        <Button @click="handleGenerate" :disabled="isGenerating" class="bg-purple-600 hover:bg-purple-700 text-white">
          <Loader2 v-if="isGenerating" class="mr-2 h-4 w-4 animate-spin" />
          <Sparkles v-else class="mr-2 h-4 w-4" />
          {{ task.latestSnapshot ? t('taskDetail.regenerate') : t('taskDetail.generateContent') }}
        </Button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
      <!-- Left Column: Source Materials -->
      <div class="lg:col-span-1 border border-slate-200 rounded-xl bg-white flex flex-col overflow-hidden">
        <div class="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 class="font-medium text-slate-900">{{ t('taskDetail.sourceArticles') }}</h3>
        </div>
        <div class="overflow-y-auto p-4 space-y-3 flex-1">
          <div v-for="item in task.items" :key="item.id" 
            class="p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition-all group"
          >
            <h4 class="text-sm font-medium text-slate-900 line-clamp-2 mb-1">
              <a :href="item.article.url" target="_blank" class="hover:underline">
                {{ item.article.title }}
              </a>
            </h4>
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span class="flex items-center">
                <FileText class="mr-1 h-3 w-3" />
                {{ t('taskDetail.article') }}
              </span>
              <a :href="item.article.url" target="_blank" class="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600">
                <ExternalLink class="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Content Editor/Preview -->
      <div class="lg:col-span-2 border border-slate-200 rounded-xl bg-white flex flex-col overflow-hidden shadow-sm">
        <div class="flex items-center border-b border-slate-200 bg-slate-50/50">
          <button 
            @click="activeTab = 'write'"
            class="px-4 py-3 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === 'write' ? 'border-emerald-500 text-emerald-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'"
          >
            {{ t('taskDetail.write') }}
          </button>
          <button 
            @click="activeTab = 'preview'"
            class="px-4 py-3 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === 'preview' ? 'border-emerald-500 text-emerald-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'"
          >
            {{ t('taskDetail.preview') }}
          </button>
        </div>
        
        <div class="flex-1 overflow-hidden relative">
          <textarea 
            v-show="activeTab === 'write'"
            v-model="editorContent"
            class="w-full h-full p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed text-slate-800"
            :placeholder="t('taskDetail.contentPlaceholder')"
          ></textarea>
          
          <div 
            v-show="activeTab === 'preview'"
            class="w-full h-full p-8 overflow-y-auto prose prose-slate prose-sm max-w-none"
            v-html="parsedContent"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
