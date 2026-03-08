<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Loader2, Sparkles, Save, FileText, ExternalLink, Plus, Trash2, History, Wand2 } from 'lucide-vue-next'
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
    translatedTitle?: string
    url: string
    sourceId: string
  }
}

interface Snapshot {
  id: string
  content: string
  versionNote: string
  createdAt: string
}

interface Task {
  id: string
  title: string
  status: 'draft' | 'generated' | 'published'
  items: TaskItem[]
  snapshots?: Snapshot[]
  latestSnapshot?: Snapshot
}

const task = ref<Task | null>(null)
const isLoading = ref(true)
const isGenerating = ref(false)
const isRefining = ref(false)
const isSaving = ref(false)
const editorContent = ref('')
const activeTab = ref<'write' | 'preview'>('write')

// Generation Modal State
const showGenerateModal = ref(false)
const selectedTemplateId = ref('')
const extraPrompt = ref('')
const availableTemplates = ref<any[]>([])

// Article Modal State
const showArticleModal = ref(false)
const availableArticles = ref<any[]>([])
const selectedArticleIds = ref<string[]>([])
const isAddingArticles = ref(false)

// Refine Modal State
const showRefineModal = ref(false)
const refineInstruction = ref('')

// Version History State
const currentSnapshotId = ref('')

const fetchTask = async () => {
  try {
    const { data, error } = await client.tasks({ id: taskId }).get()
    if (error) throw error
    if (data) {
      task.value = data as any
      // If we have snapshots, use the latest one or the currently selected one
      const snaps = (data as any).snapshots || []
      if (snaps.length > 0) {
        if (!currentSnapshotId.value) {
           currentSnapshotId.value = snaps[0].id
           editorContent.value = snaps[0].content
        }
      } else if (task.value?.latestSnapshot?.content) {
         // Fallback for backward compatibility if backend doesn't return snapshots array yet (though we updated it)
         editorContent.value = task.value.latestSnapshot.content
      }
      
      if (task.value?.status === 'generated' || task.value?.status === 'published') {
          activeTab.value = 'preview'
      }
    }
  } catch (err) {
    console.error('Failed to fetch task:', err)
  } finally {
    isLoading.value = false
  }
}

const fetchTemplates = async () => {
  try {
    const { data } = await client.templates.get({ query: { type: 'curated' } })
    if (data) {
      availableTemplates.value = data
    }
  } catch (err) {
    console.error('Failed to fetch templates:', err)
  }
}

const fetchArticles = async () => {
  try {
    const { data } = await client.articles.get({ query: { limit: '50' } }) // Limit to 50 recent
    if (data) {
      // Filter out articles already in the task
      const existingIds = new Set(task.value?.items.map(i => i.article.id) || [])
      availableArticles.value = data.filter((a: any) => !existingIds.has(a.id))
    }
  } catch (err) {
    console.error('Failed to fetch articles:', err)
  }
}

const openGenerateModal = async () => {
  await fetchTemplates()
  // Set default template if exists
  if (availableTemplates.value.length > 0 && !selectedTemplateId.value) {
     selectedTemplateId.value = availableTemplates.value[0].id
  }
  showGenerateModal.value = true
}

const confirmGenerate = async () => {
  isGenerating.value = true
  showGenerateModal.value = false
  try {
    const { data, error } = await client.tasks({ id: taskId }).generate.post({
      templateId: selectedTemplateId.value,
      extraPrompt: extraPrompt.value
    })
    if (error) throw error
    if (data && (data as any).content) {
      editorContent.value = (data as any).content
      activeTab.value = 'preview'
      currentSnapshotId.value = '' // Reset to force update from fetchTask
      // Refresh task to update status and snapshots
      fetchTask()
    }
  } catch (err) {
    console.error('Failed to generate content:', err)
  } finally {
    isGenerating.value = false
  }
}

const openArticleModal = async () => {
  selectedArticleIds.value = []
  await fetchArticles()
  showArticleModal.value = true
}

const confirmAddArticles = async () => {
  if (selectedArticleIds.value.length === 0) return
  isAddingArticles.value = true
  try {
    await client.tasks({ id: taskId }).articles.post({
      articleIds: selectedArticleIds.value
    })
    showArticleModal.value = false
    fetchTask()
  } catch (err) {
    console.error('Failed to add articles:', err)
  } finally {
    isAddingArticles.value = false
  }
}

const removeArticle = async (articleId: string) => {
  if (!confirm(t('common.confirmDelete') || 'Remove this article?')) return
  try {
    await client.tasks({ id: taskId }).articles({ articleId }).delete()
    fetchTask()
  } catch (err) {
    console.error('Failed to remove article:', err)
  }
}

const openRefineModal = () => {
  refineInstruction.value = ''
  showRefineModal.value = true
}

const confirmRefine = async () => {
  if (!refineInstruction.value) return
  isRefining.value = true
  showRefineModal.value = false
  try {
    const { data, error } = await client.tasks({ id: taskId }).refine.post({
      content: editorContent.value,
      instruction: refineInstruction.value
    })
    if (error) throw error
    if (data && (data as any).content) {
      editorContent.value = (data as any).content
      currentSnapshotId.value = '' 
      fetchTask()
    }
  } catch (err) {
    console.error('Failed to refine content:', err)
  } finally {
    isRefining.value = false
  }
}

const loadSnapshot = (snapshotId: string) => {
  currentSnapshotId.value = snapshotId
  const snapshot = task.value?.snapshots?.find(s => s.id === snapshotId)
  if (snapshot) {
    editorContent.value = snapshot.content
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
    // Refresh to get new snapshot
    currentSnapshotId.value = ''
    fetchTask()
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
        <Button @click="openGenerateModal" :disabled="isGenerating" class="bg-purple-600 hover:bg-purple-700 text-white">
          <Loader2 v-if="isGenerating" class="mr-2 h-4 w-4 animate-spin" />
          <Sparkles v-else class="mr-2 h-4 w-4" />
          {{ task.snapshots?.length ? t('taskDetail.regenerate') : t('taskDetail.generateContent') }}
        </Button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
      <!-- Left Column: Source Materials -->
      <div class="lg:col-span-1 border border-slate-200 rounded-xl bg-white flex flex-col overflow-hidden">
        <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 class="font-medium text-slate-900">{{ t('taskDetail.sourceArticles') }}</h3>
          <Button size="icon" variant="ghost" class="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" @click="openArticleModal">
            <Plus class="h-4 w-4" />
          </Button>
        </div>
        <div class="overflow-y-auto p-4 space-y-3 flex-1">
          <div v-for="item in task.items" :key="item.id" 
            class="p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition-all group relative pr-8"
          >
            <button 
              @click.stop="removeArticle(item.article.id)"
              class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-1"
              title="Remove article"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
            <h4 class="text-sm font-medium text-slate-900 line-clamp-2 mb-1">
              <a :href="item.article.url" target="_blank" class="hover:underline">
                {{ item.article.translatedTitle || item.article.title }}
              </a>
            </h4>
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span class="flex items-center">
                <FileText class="mr-1 h-3 w-3" />
                {{ t('taskDetail.article') }}
                <span v-if="item.article.translatedTitle" class="ml-2 px-1 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-medium">译</span>
              </span>
              <a :href="item.article.url" target="_blank" class="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 mr-6">
                <ExternalLink class="h-3 w-3" />
              </a>
            </div>
          </div>
          <div v-if="task.items.length === 0" class="text-center py-8 text-slate-500 text-sm">
            <p>{{ t('taskDetail.noArticles') || 'No articles added yet.' }}</p>
            <Button variant="link" size="sm" class="mt-2 text-emerald-600" @click="openArticleModal">
              {{ t('taskDetail.addArticle') || 'Add Article' }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Right Column: Content Editor/Preview -->
      <div class="lg:col-span-2 border border-slate-200 rounded-xl bg-white flex flex-col overflow-hidden shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 pr-4">
          <div class="flex items-center">
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

          <div class="flex items-center gap-2">
            <!-- Version History -->
            <div v-if="task.snapshots && task.snapshots.length > 0" class="flex items-center gap-2 mr-2">
              <History class="h-4 w-4 text-slate-400" />
              <select 
                v-model="currentSnapshotId" 
                @change="loadSnapshot(currentSnapshotId)"
                class="bg-transparent text-xs text-slate-600 border-none focus:ring-0 cursor-pointer max-w-[150px]"
              >
                <option v-for="snap in task.snapshots" :key="snap.id" :value="snap.id">
                   {{ new Date(snap.createdAt).toLocaleString() }} - {{ snap.versionNote || 'Version' }}
                </option>
              </select>
            </div>
            
            <!-- AI Refine -->
            <Button 
              v-if="editorContent"
              variant="ghost" 
              size="sm" 
              class="text-purple-600 hover:text-purple-700 hover:bg-purple-50 h-8 px-2"
              @click="openRefineModal"
            >
              <Wand2 class="h-3.5 w-3.5 mr-1.5" />
              {{ t('taskDetail.refine') || 'AI Refine' }}
            </Button>
          </div>
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
  <!-- Generate Modal -->
  <div v-if="showGenerateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-6 border-b border-slate-100">
        <h3 class="text-lg font-medium text-slate-900">{{ t('taskDetail.generateContent') }}</h3>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">{{ t('settings.templates') }}</label>
          <select v-model="selectedTemplateId" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="" disabled>{{ t('common.selectTemplate') || 'Select a template' }}</option>
            <option v-for="t in availableTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">{{ t('taskDetail.extraPrompt') || 'Extra Instructions' }}</label>
          <textarea v-model="extraPrompt" rows="4" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" :placeholder="t('taskDetail.extraPromptPlaceholder') || 'E.g., Focus on React ecosystem...'"></textarea>
        </div>
      </div>
      <div class="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
        <Button variant="ghost" @click="showGenerateModal = false">{{ t('common.cancel') }}</Button>
        <Button @click="confirmGenerate" :disabled="isGenerating || !selectedTemplateId" class="bg-purple-600 hover:bg-purple-700 text-white">
          <Sparkles class="mr-2 h-4 w-4" />
          {{ t('common.generate') || 'Generate' }}
        </Button>
      </div>
    </div>
  </div>

  <!-- Article Modal -->
  <div v-if="showArticleModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-6 border-b border-slate-100 shrink-0">
        <h3 class="text-lg font-medium text-slate-900">{{ t('taskDetail.addArticles') || 'Add Articles' }}</h3>
      </div>
      <div class="p-4 overflow-y-auto flex-1 space-y-2">
        <div v-if="availableArticles.length === 0" class="text-center py-8 text-slate-500">
          {{ t('taskDetail.noAvailableArticles') || 'No new articles available.' }}
        </div>
        <div v-for="article in availableArticles" :key="article.id" class="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer" @click="selectedArticleIds.includes(article.id) ? selectedArticleIds = selectedArticleIds.filter(id => id !== article.id) : selectedArticleIds.push(article.id)">
          <div class="pt-1">
            <input type="checkbox" :checked="selectedArticleIds.includes(article.id)" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          </div>
          <div>
            <h4 class="text-sm font-medium text-slate-900 flex items-center gap-2">
              {{ article.translatedTitle || article.title }}
              <span v-if="article.translatedTitle" class="px-1 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-medium">译</span>
            </h4>
            <p class="text-xs text-slate-500 mt-1 line-clamp-1">{{ article.url }}</p>
          </div>
        </div>
      </div>
      <div class="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
        <Button variant="ghost" @click="showArticleModal = false">{{ t('common.cancel') }}</Button>
        <Button @click="confirmAddArticles" :disabled="isAddingArticles || selectedArticleIds.length === 0" class="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus class="mr-2 h-4 w-4" />
          {{ t('common.addSelected', { count: selectedArticleIds.length }) || `Add (${selectedArticleIds.length})` }}
        </Button>
      </div>
    </div>
  </div>

  <!-- Refine Modal -->
  <div v-if="showRefineModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
    <div class="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="p-6 border-b border-slate-100">
        <h3 class="text-lg font-medium text-slate-900">{{ t('taskDetail.refineContent') || 'Refine Content' }}</h3>
      </div>
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">{{ t('taskDetail.refineInstruction') || 'What should AI do?' }}</label>
          <textarea v-model="refineInstruction" rows="4" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" :placeholder="t('taskDetail.refinePlaceholder') || 'E.g., Make the tone more professional, or expand the first section...'"></textarea>
        </div>
      </div>
      <div class="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
        <Button variant="ghost" @click="showRefineModal = false">{{ t('common.cancel') }}</Button>
        <Button @click="confirmRefine" :disabled="isRefining || !refineInstruction" class="bg-purple-600 hover:bg-purple-700 text-white">
          <Wand2 class="mr-2 h-4 w-4" />
          {{ t('common.refine') || 'Refine' }}
        </Button>
      </div>
    </div>
  </div>
</template>
