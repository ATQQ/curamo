<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Plus, Loader2, Rss, Globe, CheckCircle2, AlertCircle, Trash2, Eye } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import client from '@/api/client'

const router = useRouter()
const { t } = useI18n()

interface Source {
  id: string
  name: string
  url: string
  type: 'rss' | 'manual'
  lastSyncedAt?: string | null
  status?: 'active' | 'error' | 'syncing'
}

const sources = ref<Source[]>([])
const isLoading = ref(true)
const isAdding = ref(false)
const isSubmitting = ref(false)
const syncingSources = ref<Set<string>>(new Set())
const deletingSourceId = ref<string | null>(null)

const newSource = ref({
  name: '',
  url: '',
  type: 'rss' as const
})

const fetchSources = async () => {
  try {
    const { data, error } = await client.sources.get()
    if (error) throw error
    if (data) sources.value = data as Source[]
  } catch (err) {
    console.error('Failed to fetch sources:', err)
  } finally {
    isLoading.value = false
  }
}

const handleAddSource = async () => {
  if (!newSource.value.name || !newSource.value.url) return
  
  isSubmitting.value = true
  try {
    const { data, error } = await client.sources.post(newSource.value)
    if (error) throw error
    if (data) {
      sources.value.push(data as Source)
      isAdding.value = false
      newSource.value = { name: '', url: '', type: 'rss' }
    }
  } catch (err) {
    console.error('Failed to add source:', err)
  } finally {
    isSubmitting.value = false
  }
}

const handleSync = async (id: string) => {
  if (syncingSources.value.has(id)) return
  
  syncingSources.value.add(id)
  try {
    const { error } = await client.sources({ id }).sync.post()
    if (error) throw error
    // Ideally we would poll for status or use websockets, but for now just show syncing state briefly
    setTimeout(() => {
        syncingSources.value.delete(id)
        fetchSources() // Refresh to update lastSyncedAt if possible
    }, 2000)
  } catch (err) {
    console.error('Failed to sync source:', err)
    syncingSources.value.delete(id)
  }
}

const handleDelete = async (id: string, name: string) => {
  if (!confirm(t('sources.deleteConfirm', { name }))) return
  
  deletingSourceId.value = id
  try {
    const { error } = await client.sources({ id }).delete()
    if (error) throw error
    
    sources.value = sources.value.filter(s => s.id !== id)
  } catch (err) {
    console.error('Failed to delete source:', err)
  } finally {
    deletingSourceId.value = null
  }
}

onMounted(() => {
  fetchSources()
})
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">{{ $t('sources.title') }}</h1>
        <p class="text-slate-500 mt-1">{{ $t('sources.subtitle') }}</p>
      </div>
      <Button @click="isAdding = true" class="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
        <Plus class="mr-2 h-4 w-4" />
        {{ $t('sources.addSource') }}
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-slate-400" />
    </div>

    <!-- Empty State -->
    <div v-else-if="sources.length === 0" class="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
      <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
        <Rss class="h-6 w-6 text-slate-400" />
      </div>
      <h3 class="text-lg font-medium text-slate-900">{{ $t('sources.noSources') }}</h3>
      <p class="text-slate-500 mt-1 max-w-sm mx-auto">{{ $t('sources.getStarted') }}</p>
      <Button @click="isAdding = true" variant="outline" class="mt-4">
        {{ $t('sources.addSource') }}
      </Button>
    </div>

    <!-- Sources Grid -->
    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="source in sources" :key="source.id" 
        class="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-emerald-200/50"
      >
        <div>
          <div class="flex items-start justify-between mb-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Rss v-if="source.type === 'rss'" class="h-5 w-5" />
              <Globe v-else class="h-5 w-5" />
            </div>
            <div class="flex items-center space-x-2">
               <span v-if="syncingSources.has(source.id)" class="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full animate-pulse">
                 {{ $t('sources.syncing') }}
               </span>
               <Button variant="ghost" size="icon" class="h-8 w-8 text-slate-400 hover:text-emerald-600" @click="handleSync(source.id)" :disabled="syncingSources.has(source.id)">
                 <Loader2 v-if="syncingSources.has(source.id)" class="h-4 w-4 animate-spin" />
                 <CheckCircle2 v-else class="h-4 w-4" />
               </Button>
               <Button variant="ghost" size="icon" class="h-8 w-8 text-slate-400 hover:text-emerald-600 ml-1" @click="router.push(`/articles?sourceId=${source.id}`)" :title="$t('sources.view')">
                 <Eye class="h-4 w-4" />
               </Button>
               <Button variant="ghost" size="icon" class="h-8 w-8 text-slate-400 hover:text-red-600 ml-1" @click="handleDelete(source.id, source.name)" :disabled="deletingSourceId === source.id">
                 <Loader2 v-if="deletingSourceId === source.id" class="h-4 w-4 animate-spin" />
                 <Trash2 v-else class="h-4 w-4" />
               </Button>
            </div>
          </div>
          
          <h3 class="font-semibold text-slate-900 line-clamp-1">{{ source.name }}</h3>
          <p class="text-sm text-slate-500 mt-1 line-clamp-1 break-all">{{ source.url }}</p>
        </div>
        
        <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>{{ source.type.toUpperCase() }}</span>
          <span v-if="source.lastSyncedAt">{{ $t('sources.lastSynced', { date: new Date(source.lastSyncedAt).toLocaleDateString() }) }}</span>
          <span v-else>{{ $t('sources.neverSynced') }}</span>
        </div>
      </div>
    </div>

    <!-- Add Source Modal (Simple Overlay) -->
    <div v-if="isAdding" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-slate-900">{{ $t('sources.addNew') }}</h2>
          <Button variant="ghost" size="icon" @click="isAdding = false" class="h-8 w-8 rounded-full">
            <span class="sr-only">Close</span>
            <span class="text-xl">×</span>
          </Button>
        </div>
        
        <form @submit.prevent="handleAddSource" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700">{{ $t('sources.name') }}</label>
            <input 
              v-model="newSource.name"
              type="text" 
              :placeholder="$t('sources.placeholderName')"
              class="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              required
            />
          </div>
          
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700">{{ $t('sources.url') }}</label>
            <input 
              v-model="newSource.url"
              type="url" 
              :placeholder="$t('sources.placeholderUrl')"
              class="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              required
            />
          </div>
          
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700">{{ $t('sources.type') }}</label>
            <select 
              v-model="newSource.type"
              class="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            >
              <option value="rss">{{ $t('sources.rss') }}</option>
              <option value="manual">{{ $t('sources.manual') }}</option>
            </select>
          </div>
          
          <div class="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" @click="isAdding = false">{{ $t('sources.cancel') }}</Button>
            <Button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
              {{ isSubmitting ? $t('sources.adding') : $t('sources.addSource') }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
