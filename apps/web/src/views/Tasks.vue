<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Plus, Loader2, FileText, Calendar, ArrowRight, CheckCircle2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import client from '@/api/client'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

interface Task {
  id: string
  title: string
  status: 'draft' | 'generated' | 'published'
  createdAt: string
  templateId?: string
}

const tasks = ref<Task[]>([])
const isLoading = ref(true)
const isAdding = ref(false)
const isSubmitting = ref(false)

const newTask = ref({
  title: '',
})

const fetchTasks = async () => {
  try {
    const { data, error } = await client.tasks.get()
    if (error) throw error
    if (data) tasks.value = data as unknown as Task[]
  } catch (err) {
    console.error('Failed to fetch tasks:', err)
  } finally {
    isLoading.value = false
  }
}

const handleAddTask = async () => {
  if (!newTask.value.title) return
  
  isSubmitting.value = true
  try {
    const { data, error } = await client.tasks.post(newTask.value)
    if (error) throw error
    if (data) {
      tasks.value.unshift(data as unknown as Task)
      isAdding.value = false
      newTask.value = { title: '' }
      // Optional: Navigate to detail
      // router.push(`/tasks/${data.id}`)
    }
  } catch (err) {
    console.error('Failed to add task:', err)
  } finally {
    isSubmitting.value = false
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published': return 'bg-emerald-100 text-emerald-700'
    case 'generated': return 'bg-blue-100 text-blue-700'
    default: return 'bg-slate-100 text-slate-700'
  }
}

const getStatusLabel = (status: string) => {
  return t(`tasks.status.${status}`)
}

onMounted(() => {
  fetchTasks()
})

// Watch for 'new' action in query params to open modal
watch(() => route.query, (query) => {
  if (query.action === 'new') {
    isAdding.value = true
    // Clear the query param to prevent reopening on reload
    router.replace({ query: { ...query, action: undefined, t: undefined } })
  }
}, { immediate: true })
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">{{ t('tasks.title') }}</h1>
        <p class="text-slate-500 mt-1">{{ t('tasks.subtitle') }}</p>
      </div>
      <Button @click="isAdding = true" class="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
        <Plus class="mr-2 h-4 w-4" />
        {{ t('tasks.newTask') }}
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <Loader2 class="h-8 w-8 animate-spin text-slate-400" />
    </div>

    <!-- Empty State -->
    <div v-else-if="tasks.length === 0" class="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
      <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
        <CheckCircle2 class="h-6 w-6 text-slate-400" />
      </div>
      <h3 class="text-lg font-medium text-slate-900">{{ t('tasks.noTasks') }}</h3>
      <p class="text-slate-500 mt-1 max-w-sm mx-auto">{{ t('tasks.createToStart') }}</p>
      <Button @click="isAdding = true" variant="outline" class="mt-4">
        {{ t('tasks.createTask') }}
      </Button>
    </div>

    <!-- Tasks Grid -->
    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="task in tasks" :key="task.id" 
        class="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-emerald-200/50 cursor-pointer"
        @click="router.push(`/tasks/${task.id}`)"
      >
        <div>
          <div class="flex items-start justify-between mb-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <FileText class="h-5 w-5" />
            </div>
            <span :class="['px-2.5 py-0.5 rounded-full text-xs font-medium', getStatusColor(task.status)]">
              {{ getStatusLabel(task.status) }}
            </span>
          </div>
          
          <h3 class="font-semibold text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">{{ task.title }}</h3>
        </div>
        
        <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span class="flex items-center">
            <Calendar class="mr-1 h-3 w-3" />
            {{ new Date(task.createdAt).toLocaleDateString() }}
          </span>
          <span class="flex items-center group-hover:text-emerald-600 transition-colors">
            {{ t('tasks.view') }}
            <ArrowRight class="ml-1 h-3 w-3" />
          </span>
        </div>
      </div>
    </div>

    <!-- Add Task Modal -->
    <div v-if="isAdding" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-slate-900">{{ t('tasks.addNew') }}</h2>
          <Button variant="ghost" size="icon" @click="isAdding = false" class="h-8 w-8 rounded-full">
            <span class="sr-only">Close</span>
            <span class="text-xl">×</span>
          </Button>
        </div>
        
        <form @submit.prevent="handleAddTask" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700">{{ t('sources.name') }}</label>
            <input 
              v-model="newTask.title"
              type="text" 
              :placeholder="t('tasks.placeholderTitle')"
              class="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              required
              autofocus
            />
          </div>
          
          <div class="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" @click="isAdding = false">{{ t('sources.cancel') }}</Button>
            <Button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
              {{ isSubmitting ? t('tasks.creating') : t('tasks.createTask') }}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
