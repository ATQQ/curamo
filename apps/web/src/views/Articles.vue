<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ExternalLink, Calendar, CheckSquare, Plus, Loader2, FileText, Languages, Bot, ChevronDown, ChevronUp, RefreshCw, Copy, Check, FileCode, Eye, Settings2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import client from '@/api/client'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

// Custom renderer to open links in new tab
const defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultRender(tokens, idx, options, env, self)
}

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
const summaryRawMode = ref<Record<string, boolean>>({})
const copiedSummary = ref<Record<string, boolean>>({})
const expandedSummary = ref<Record<string, boolean>>({})

// Summary Options State
const templates = ref<any[]>([])
const showSummaryOptions = ref(false)
const targetArticle = ref<Article | null>(null)
const selectedTemplateId = ref<string>('')
const defaultTemplateId = ref<string>('')
const extraPrompt = ref('')
const refetchContent = ref(false)

const fetchTemplates = async () => {
  try {
    const { data } = await client.templates.get()
    if (data) templates.value = data
  } catch (err) {
    console.error('Failed to fetch templates:', err)
  }
}

const fetchSettings = async () => {
  try {
    const { data } = await client.settings.get()
    if (data && Array.isArray(data)) {
      const defaultTemplateSetting = data.find((s: any) => s.key === 'default_template_id')
      if (defaultTemplateSetting) defaultTemplateId.value = defaultTemplateSetting.value
    }
  } catch (err) {
    console.error('Failed to fetch settings:', err)
  }
}

const openSummaryOptions = (article: Article, defaultRefetch = false) => {
  targetArticle.value = article
  selectedTemplateId.value = defaultTemplateId.value
  extraPrompt.value = ''
  refetchContent.value = defaultRefetch
  if (templates.value.length === 0) fetchTemplates()
  showSummaryOptions.value = true
}

const confirmSummary = () => {
  if (targetArticle.value) {
    toggleSummary(
      targetArticle.value,
      true,
      selectedTemplateId.value || undefined,
      extraPrompt.value || undefined,
      refetchContent.value
    )
  }
  showSummaryOptions.value = false
}

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

const toggleSummary = async (article: Article, force = false, templateId?: string, extraPrompt?: string, refetch = false) => {
  if (!force && showSummary.value[article.id] && !templateId && !extraPrompt) {
    showSummary.value[article.id] = false
    return
  }

  if (!force && article.aiSummary && !templateId && !extraPrompt) {
    showSummary.value[article.id] = true
    return
  }

  summarizing.value[article.id] = true
  try {
    const { data } = await (client.articles({ id: article.id }) as any).summarize.post({
      templateId,
      extraPrompt,
      refetchContent: refetch || undefined
    })
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

const copySummary = async (article: Article) => {
  if (!article.aiSummary) return
  
  try {
    await navigator.clipboard.writeText(article.aiSummary)
    copiedSummary.value[article.id] = true
    setTimeout(() => {
      copiedSummary.value[article.id] = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const toggleSummaryMode = (article: Article) => {
  summaryRawMode.value[article.id] = !summaryRawMode.value[article.id]
}

const toggleExpandSummary = (article: Article) => {
  expandedSummary.value[article.id] = !expandedSummary.value[article.id]
}


const fetchArticles = async () => {
  try {
    const sourceId = route.query.sourceId as string | undefined
    const { data, error } = await client.articles.get({
      query: sourceId ? { sourceId } : undefined
    })
    if (error) throw error
    if (data) {
      articles.value = data as Article[]
      
      // Initialize display state based on existing data
      articles.value.forEach(article => {
        if (article.translatedTitle) {
          showTranslated.value[article.id] = true
        }
        if (article.aiSummary) {
          showSummary.value[article.id] = true
        }
      })
    }
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
  fetchSettings()
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

            <div class="flex items-center gap-1">
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
              <Button
                v-if="!summarizing[article.id]"
                size="sm"
                variant="ghost"
                class="h-7 w-7 px-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                @click.stop="openSummaryOptions(article)"
                :title="t('articles.summarizeOptions') || 'Summarize Options'"
              >
                <Settings2 class="h-3 w-3" />
              </Button>
            </div>

            <div v-if="showSummary[article.id]" class="flex items-center gap-1">
              <Button 
                size="sm" 
                variant="ghost" 
                class="h-7 px-2 text-xs text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                @click.stop="openSummaryOptions(article, true)"
                :disabled="summarizing[article.id]"
              >
                <Loader2 v-if="summarizing[article.id]" class="mr-1 h-3 w-3 animate-spin" />
                <RefreshCw v-else class="mr-1 h-3 w-3" />
                {{ t('articles.resummarize') }}
              </Button>
            </div>

            <a :href="article.url" target="_blank" class="inline-flex items-center justify-center h-7 px-2 rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground text-slate-500 hover:text-emerald-600" @click.stop>
              <ExternalLink class="mr-1 h-3 w-3" />
              {{ t('articles.readOriginal') }}
            </a>
          </div>

          <!-- AI Summary Section -->
          <div v-if="showSummary[article.id] && article.aiSummary" class="mt-3 bg-slate-50 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-2 overflow-hidden">
            <div class="flex items-center justify-between p-3 border-b border-slate-100/50">
              <div class="flex items-center gap-2">
                <Bot class="h-3.5 w-3.5 text-emerald-600" />
                <span class="text-xs font-medium text-slate-700">AI Summary</span>
              </div>
              <div class="flex items-center gap-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  class="h-6 w-6 text-slate-400 hover:text-emerald-600"
                  :title="summaryRawMode[article.id] ? 'Preview Markdown' : 'View Raw Markdown'"
                  @click.stop="toggleSummaryMode(article)"
                >
                  <Eye v-if="summaryRawMode[article.id]" class="h-3.5 w-3.5" />
                  <FileCode v-else class="h-3.5 w-3.5" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  class="h-6 w-6 text-slate-400 hover:text-emerald-600"
                  :title="copiedSummary[article.id] ? 'Copied!' : 'Copy to clipboard'"
                  @click.stop="copySummary(article)"
                >
                  <Check v-if="copiedSummary[article.id]" class="h-3.5 w-3.5 text-emerald-600" />
                  <Copy v-else class="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            
            <!-- AI Summary Content -->
            <div class="relative group/summary">
              <div 
                class="p-4 text-sm text-slate-600 leading-relaxed transition-all duration-300 ease-in-out"
                :class="[!expandedSummary[article.id] ? 'max-h-48 overflow-hidden' : 'max-h-none']"
              >
                <div 
                  v-if="!summaryRawMode[article.id]" 
                  class="prose prose-sm max-w-none prose-slate 
                    prose-headings:font-bold prose-headings:text-slate-900 
                    prose-h1:text-xl prose-h2:text-lg prose-h3:text-base 
                    prose-p:my-2 prose-p:leading-7
                    prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
                    prose-blockquote:border-l-4 prose-blockquote:border-emerald-200 prose-blockquote:bg-emerald-50/30 prose-blockquote:py-1 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600
                    prose-ul:list-disc prose-ul:pl-5 prose-li:marker:text-emerald-400
                    prose-ol:list-decimal prose-ol:pl-5 prose-li:marker:text-emerald-600
                    prose-strong:font-bold prose-strong:text-slate-800
                    prose-code:text-emerald-700 prose-code:bg-emerald-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-code:font-mono prose-code:text-[0.85em]
                    prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:rounded-lg prose-pre:p-4
                    prose-img:rounded-lg prose-img:shadow-sm prose-img:border prose-img:border-slate-100
                    prose-hr:border-slate-200 prose-hr:my-6 md-transform-wrapper" 
                  v-html="md.render(article.aiSummary)"
                  @click="!expandedSummary[article.id] ? toggleExpandSummary(article) : null"
                  :class="{ 'cursor-pointer': !expandedSummary[article.id] }"
                ></div>
                <pre v-else class="whitespace-pre-wrap font-mono text-xs bg-white p-3 rounded border border-slate-200 overflow-x-auto">{{ article.aiSummary }}</pre>
              </div>

              <!-- Gradient Mask (only when collapsed) -->
              <div 
                v-if="!expandedSummary[article.id]" 
                class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent pointer-events-none flex items-end justify-center pb-2"
              >
              </div>

              <!-- Expand/Collapse Button -->
              <div class="flex justify-center mt-2 pb-1 relative z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-6 text-xs text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full px-3 transition-all"
                  @click.stop="toggleExpandSummary(article)"
                >
                  <span v-if="!expandedSummary[article.id]" class="flex items-center">
                    {{ t('articles.readMore') || 'Read more' }}
                    <ChevronDown class="ml-1 h-3 w-3" />
                  </span>
                  <span v-else class="flex items-center">
                    {{ t('articles.showLess') || 'Show less' }}
                    <ChevronUp class="ml-1 h-3 w-3" />
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Summary Options Dialog -->
    <div v-if="showSummaryOptions" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="showSummaryOptions = false">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
        <h3 class="text-lg font-semibold text-slate-900 mb-4">{{ t('articles.summarizeOptions') || 'Summarize Options' }}</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('settings.summaryTemplate') }}</label>
            <select v-model="selectedTemplateId" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
              <option value="">{{ t('common.default') }}</option>
              <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">{{ t('settings.extraPrompt') }}</label>
            <textarea v-model="extraPrompt" rows="3" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" :placeholder="t('articles.extraPromptPlaceholder')"></textarea>
          </div>

          <!-- 重新抓取原文内容开关 -->
          <div
            class="flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors"
            :class="refetchContent ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'"
            @click="refetchContent = !refetchContent"
          >
            <div class="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors"
              :class="refetchContent ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'"
            >
              <svg v-if="refetchContent" class="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 8">
                <path d="M1 4l3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium" :class="refetchContent ? 'text-emerald-800' : 'text-slate-700'">
                {{ t('articles.refetchContent') }}
              </p>
              <p class="text-xs mt-0.5" :class="refetchContent ? 'text-emerald-600' : 'text-slate-500'">
                {{ t('articles.refetchContentHint') }}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <Button variant="ghost" @click="showSummaryOptions = false">{{ t('common.cancel') || 'Cancel' }}</Button>
          <Button @click="confirmSummary" class="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Bot class="mr-2 h-4 w-4" />
            {{ t('articles.summarize') || 'Summarize' }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="css">
@import './styles/articles.css';
</style>