<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Clock, X } from 'lucide-vue-next'
import client from '@/api/client'

const props = defineProps<{
  open: boolean
  type: string
  title: string
}>()

const emit = defineEmits(['update:open'])

const tasks = ref<any[]>([])
const loading = ref(false)

const fetchTasks = async () => {
  if (!props.type) return
  loading.value = true
  try {
    const { data, error } = await client["async-tasks"].get({
      query: {
        type: props.type,
        limit: '50'
      }
    })
    if (data) {
      tasks.value = data
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch(() => props.open, (newVal) => {
  if (newVal) {
    fetchTasks()
  }
})

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-emerald-500/15 text-emerald-600 border-emerald-200'
    case 'processing': return 'bg-blue-500/15 text-blue-600 border-blue-200'
    case 'failed': return 'bg-red-500/15 text-red-600 border-red-200'
    default: return 'bg-slate-500/15 text-slate-600 border-slate-200'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return CheckCircle2
    case 'processing': return Loader2
    case 'failed': return XCircle
    default: return Clock
  }
}

const formatTime = (dateStr: string | Date | null) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date)
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" @click.self="$emit('update:open', false)">
    <div class="bg-background rounded-lg shadow-lg w-full max-w-lg overflow-hidden border animate-in zoom-in-95 duration-200">
      <div class="flex items-center justify-between p-4 border-b">
        <div>
          <h3 class="font-semibold text-lg">{{ title }}</h3>
          <p class="text-sm text-muted-foreground">任务状态列表</p>
        </div>
        <button class="text-muted-foreground hover:text-foreground" @click="$emit('update:open', false)">
          <X class="h-5 w-5" />
        </button>
      </div>
      
      <div class="p-4 max-h-[60vh] overflow-y-auto">
        <div v-if="loading" class="flex justify-center py-8">
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        
        <div v-else-if="tasks.length === 0" class="text-center py-8 text-muted-foreground">
          暂无任务记录
        </div>
        
        <div v-else class="space-y-3">
          <div v-for="task in tasks" :key="task.id" class="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div class="flex items-center gap-3">
              <component :is="getStatusIcon(task.status)" 
                class="h-5 w-5" 
                :class="{
                  'text-emerald-500': task.status === 'completed',
                  'text-blue-500 animate-spin': task.status === 'processing',
                  'text-red-500': task.status === 'failed',
                  'text-slate-500': task.status === 'pending'
                }"
              />
              <div class="flex flex-col">
                <span class="text-sm font-medium">
                  {{ task.payload?.title || (task.type === 'summarize' ? '文章总结' : '任务') }} #{{ task.id.slice(0, 8) }}
                </span>
                <span class="text-xs text-muted-foreground">
                  {{ formatTime(task.createdAt) }}
                </span>
              </div>
            </div>
            
            <div :class="['px-2.5 py-0.5 text-xs font-semibold rounded-full border', getStatusColor(task.status)]">
              {{ task.status === 'processing' ? '进行中' : 
                 task.status === 'completed' ? '已完成' : 
                 task.status === 'failed' ? '失败' : '等待中' }}
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t flex justify-end gap-2 bg-muted/10">
        <Button variant="outline" size="sm" @click="fetchTasks">
          <Loader2 v-if="loading" class="mr-2 h-3 w-3 animate-spin" />
          刷新
        </Button>
        <Button size="sm" @click="$emit('update:open', false)">关闭</Button>
      </div>
    </div>
  </div>
</template>
