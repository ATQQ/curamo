<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ExternalLink, Calendar, CheckSquare, Plus, Loader2, FileText, Languages, Bot, ChevronDown, ChevronUp, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import client from '@/api/client'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

interface Article {
  id: string
  title: string
  translatedTitle?: string | null
  url: string
  content?: string | null
  aiSummary?: string | null
  sourceId?: string | null
  publishedAt: string | Date
  status: 'unread' | 'read' | 'archived'
}

const articles = ref<Article[]>([])
const isLoading = ref(true)
const selectedArticles = ref<Set<string>>(new Set())
const isSelectionMode = ref(false)
const isCreatingTask = ref(false)

// AI Features State
const showTranslated = ref<Record<string, boolean>>({})
const translating = ref<Record<string, boolean>>({})
const showSummary = ref<Record<string, boolean>>({})
const summarizing = ref<Record<string, boolean>>({})

const toggleTranslate = async (article: Article, force = false) => {
  if (!force && showTranslated.value[article.id]) {
    showTranslated.value[article.id] = false
    return
  }

  if (!force && article.translatedTitle) {
    showTranslated.value[article.id] = true
    return
  }

  translating.value[article.id] = true
  try {
    const { data } = await (client.articles({ id: article.id }) as any).translate.post({})
    if (data && data.translatedTitle) {
      // Refresh the single article data from server to ensure data consistency
      const { data: refreshedData } = await client.articles({ id: article.id }).get()
      if (refreshedData) {
        Object.assign(article, refreshedData)
        showTranslated.value[article.id] = true
      }
    }
  } catch (err) {
    console.error('Translation failed:', err)
  } finally {
    translating.value[article.id] = false
  }
}

const toggleSummary = async (article: Article) => {
  if (showSummary.value[article.id]) {
    showSummary.value[article.id] = false
    return
  }

  if (article.aiSummary) {
    showSummary.value[article.id] = true
    return
  }

  summarizing.value[article.id] = true
  try {
    const { data } = await (client.articles({ id: article.id }) as any).summarize.post()
    if (data && data.aiSummary) {
      // Refresh the single article data from server
      const { data: refreshedData } = await client.articles({ id: article.id }).get()
      if (refreshedData) {
        Object.assign(article, refreshedData)
        showSummary.value[article.id] = true
      }
    }
  } catch (err) {
    console.error('Summarization failed:', err)
  } finally {
    summarizing.value[article.id] = false
  }
}

const fetchArticles = async () => {
  try {
    const sourceId = route.query.sourceId as string | undefined
    const { data, error } = await client.articles.get({
      query: sourceId ? { sourceId } : undefined
    })
    if (error) throw error
    if (data) articles.value = data as Article[]
  } catch (err) {
    console.error('Failed to fetch articles:', err)
  } finally {
    isLoading.value = false
  }
}

const toggleSelection = (id: string) => {
  if (selectedArticles.value.has(id)) {
    selectedArticles.value.delete(id)
  } else {
    selectedArticles.value.add(id)
  }
}

const toggleSelectionMode = () => {
  isSelectionMode.value = !isSelectionMode.value
  if (!isSelectionMode.value) {
    selectedArticles.value.clear()
  }
}

const createDraftTask = async () => {
  if (selectedArticles.value.size === 0) return
  
  isCreatingTask.value = true
  try {
    const { data, error } = await (client.tasks as any).index.post({
      title: `Curated Task - ${new Date().toLocaleDateString()}`,
      articleIds: Array.from(selectedArticles.value)
    })
    
    if (error) throw error
    
    if (data) {
      // Navigate to the new task
      router.push(`/tasks/${(data as any).id}`)
    }
  } catch (err) {
    console.error('Failed to create task:', err)
  } finally {
    isCreatingTask.value = false
  }
}

onMounted(() => {
  fetchArticles()
})
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b border-border/40 -mx-6 px-6 md:mx-0 md:px-0 md:border-none md:static md:py-0 md:bg-transparent">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">{{ t('articles.title') }}</h1>
        <p class="text-slate-500 mt-1">{{ t('articles.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-3">
        <Button 
          v-if="isSelectionMode && selectedArticles.size > 0" 
          @click="createDraftTask" 
          class="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all animate-in fade-in slide-in-from-right-4"
          :disabled="isCreatingTask"
        >
          <Loader2 v-if="isCreatingTask" class="mr-2 h-4 w-4 animate-spin" />
          <Plus v-else class="mr-2 h-4 w-4" />
          {{ t('articles.createTask', { count: selectedArticles.size }) }}
        </Button>
        
        <Button 
          variant="outline" 
          :class="{ 'bg-slate-100 text-slate-900 border-slate-300': isSelectionMode }"
          @click="toggleSelectionMode"
        >
          <CheckSquare class="mr-2 h-4 w-4" />
          {{ isSelectionMode ? t('articles.cancelSelection') : t('articles.selectArticles') }}
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-slate-400" />
    </div>

    <!-- Empty State -->
    <div v-else-if="articles.length === 0" class="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
      <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
        <FileText class="h-6 w-6 text-slate-400" />
      </div>
      <h3 class="text-lg font-medium text-slate-900">{{ t('articles.noArticles') }}</h3>
      <p class="text-slate-500 mt-1 max-w-sm mx-auto">{{ t('articles.syncSources') }}</p>
      <Button variant="outline" class="mt-4" @click="router.push('/sources')">
        {{ t('articles.goToSources') }}
      </Button>
    </div>

    <!-- Articles List -->
    <div v-else class="grid gap-4">
      <div v-for="article in articles" :key="article.id" 
        class="group relative flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        :class="{ 'ring-2 ring-emerald-500 border-transparent bg-emerald-50/30': selectedArticles.has(article.id) }"
        @click="isSelectionMode ? toggleSelection(article.id) : null"
      >
        <!-- Checkbox for selection mode -->
        <div v-if="isSelectionMode" class="mt-1">
          <div class="h-5 w-5 rounded border border-slate-300 flex items-center justify-center transition-colors"
            :class="{ 'bg-emerald-600 border-emerald-600': selectedArticles.has(article.id), 'bg-white': !selectedArticles.has(article.id) }"
          >
            <CheckSquare v-if="selectedArticles.has(article.id)" class="h-3.5 w-3.5 text-white" />
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {{ t('articles.news') }}
            </span>
            <span class="text-xs text-slate-400 flex items-center">
              <Calendar class="mr-1 h-3 w-3" />
              {{ new Date(article.publishedAt).toLocaleDateString() }}
            </span>
          </div>
          
          <h3 class="text-lg font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
            <a :href="article.url" target="_blank" class="hover:underline focus:outline-none" @click.stop>
              {{ showTranslated[article.id] ? article.translatedTitle : article.title }}
            </a>
          </h3>
          
          <div class="mt-3 flex items-center flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              class="h-7 px-2 text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
              @click.stop="toggleTranslate(article)"
              :disabled="translating[article.id]"
            >
              <Loader2 v-if="translating[article.id]" class="mr-1 h-3 w-3 animate-spin" />
              <Languages v-else class="mr-1 h-3 w-3" />
              {{ showTranslated[article.id] ? (t('articles.showOriginal') || 'Show Original') : (t('articles.translate') || 'Translate') }}
            </Button>

            <Button 
              v-if="showTranslated[article.id]"
              size="sm" 
              variant="ghost" 
              class="h-7 px-2 text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
              @click.stop="toggleTranslate(article, true)"
              :disabled="translating[article.id]"
            >
              <RefreshCw :class="['mr-1 h-3 w-3', { 'animate-spin': translating[article.id] }]" />
              {{ t('articles.retranslate') || 'Re-translate' }}
            </Button>

            <Button 
              size="sm" 
              variant="ghost" 
              class="h-7 px-2 text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
              @click.stop="toggleSummary(article)"
              :disabled="summarizing[article.id]"
            >
              <Loader2 v-if="summarizing[article.id]" class="mr-1 h-3 w-3 animate-spin" />
              <Bot v-else class="mr-1 h-3 w-3" />
              {{ showSummary[article.id] ? (t('articles.hideSummary') || 'Hide Summary') : (t('articles.summarize') || 'Summarize') }}
            </Button>

            <a :href="article.url" target="_blank" class="inline-flex items-center justify-center h-7 px-2 rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground text-slate-500 hover:text-emerald-600" @click.stop>
              <ExternalLink class="mr-1 h-3 w-3" />
              {{ t('articles.readOriginal') }}
            </a>
          </div>

          <!-- AI Summary Section -->
          <div v-if="showSummary[article.id] && article.aiSummary" class="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-2">
            <div class="flex items-center gap-2 mb-2">
              <Bot class="h-3.5 w-3.5 text-emerald-600" />
              <span class="text-xs font-medium text-slate-700">AI Summary</span>
            </div>
            <div class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{{ article.aiSummary }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
