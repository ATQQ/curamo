<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Plus, ArrowUpRight, Clock, FileText, CheckCircle2, Rss } from 'lucide-vue-next'
import client from '@/api/client'
import { useRouter } from 'vue-router'

const router = useRouter()

const stats = ref({
  totalArticles: 0,
  activeTasks: 0,
  generatingTasks: 0,
  publishedTasks: 0
})

const recentTasks = ref<any[]>([])
const isLoading = ref(true)

const fetchStats = async () => {
  try {
    // Fetch articles count
    const { data: articles } = await client.articles.index.get()
    if (articles) {
      stats.value.totalArticles = (articles as any[]).length
    }

    // Fetch tasks stats
    const { data: tasks } = await client.tasks.index.get()
    if (tasks) {
      const taskList = tasks as any[]
      stats.value.activeTasks = taskList.filter(t => t.status !== 'published').length
      stats.value.generatingTasks = taskList.filter(t => t.status === 'generated').length
      stats.value.publishedTasks = taskList.filter(t => t.status === 'published').length
      
      // Get recent tasks (last 3)
      recentTasks.value = taskList
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3)
    }
  } catch (err) {
    console.error('Failed to fetch dashboard stats:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-foreground">{{ $t('dashboard.title') }}</h1>
        <p class="text-muted-foreground mt-1">{{ $t('dashboard.welcome') }}</p>
      </div>
      <div class="flex items-center gap-3">
        <Button variant="outline" @click="router.push('/tasks')">
          {{ $t('dashboard.viewReports') }}
        </Button>
        <Button class="shadow-sm" @click="router.push('/tasks')">
          <Plus class="mr-2 h-4 w-4" />
          {{ $t('dashboard.newTask') }}
        </Button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-border/50 bg-card text-card-foreground shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
        <div class="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 class="tracking-tight text-sm font-medium text-muted-foreground">{{ $t('dashboard.stats.totalArticles') }}</h3>
          <FileText class="h-4 w-4 text-muted-foreground" />
        </div>
        <div class="text-2xl font-bold">{{ stats.totalArticles }}</div>
        <p class="text-xs text-muted-foreground mt-1 flex items-center">
          <span class="text-emerald-600 flex items-center mr-1">
            <ArrowUpRight class="h-3 w-3 mr-0.5" /> +12%
          </span>
          {{ $t('dashboard.stats.fromLastMonth') }}
        </p>
      </div>
      
      <div class="rounded-xl border border-border/50 bg-card text-card-foreground shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
        <div class="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 class="tracking-tight text-sm font-medium text-muted-foreground">{{ $t('dashboard.stats.activeTasks') }}</h3>
          <Clock class="h-4 w-4 text-muted-foreground" />
        </div>
        <div class="text-2xl font-bold">{{ stats.activeTasks }}</div>
        <p class="text-xs text-muted-foreground mt-1">
          {{ stats.generatingTasks }} {{ $t('dashboard.stats.generating') }}
        </p>
      </div>

      <div class="rounded-xl border border-border/50 bg-card text-card-foreground shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
        <div class="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 class="tracking-tight text-sm font-medium text-muted-foreground">{{ $t('dashboard.stats.published') }}</h3>
          <CheckCircle2 class="h-4 w-4 text-muted-foreground" />
        </div>
        <div class="text-2xl font-bold">{{ stats.publishedTasks }}</div>
        <p class="text-xs text-muted-foreground mt-1 flex items-center">
          <span class="text-emerald-600 flex items-center mr-1">
            <ArrowUpRight class="h-3 w-3 mr-0.5" /> +4%
          </span>
          {{ $t('dashboard.stats.fromLastWeek') }}
        </p>
      </div>
      
      <!-- Quick Action Card -->
      <div 
        @click="router.push('/sources')"
        class="rounded-xl border border-dashed border-border bg-muted/5 p-6 flex flex-col justify-center items-center text-center hover:bg-muted/10 transition-colors cursor-pointer group"
      >
        <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <Plus class="h-5 w-5 text-primary" />
        </div>
        <h3 class="font-medium text-foreground">{{ $t('dashboard.stats.createSource') }}</h3>
        <p class="text-xs text-muted-foreground mt-1">{{ $t('dashboard.stats.addSourceDesc') }}</p>
      </div>
    </div>

    <!-- Recent Activity Section -->
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
      <div class="col-span-4 rounded-xl border border-border/50 bg-card text-card-foreground shadow-sm">
        <div class="p-6 pb-3">
          <h3 class="text-lg font-semibold leading-none tracking-tight">{{ $t('dashboard.recentTasks.title') }}</h3>
          <p class="text-sm text-muted-foreground mt-1.5">
            {{ $t('dashboard.recentTasks.remaining', { count: stats.activeTasks }) }}
          </p>
        </div>
        <div class="p-6 pt-0">
          <div class="space-y-4">
            <div v-if="recentTasks.length === 0" class="text-sm text-muted-foreground text-center py-4">
              No recent tasks found.
            </div>
            <div v-for="task in recentTasks" :key="task.id" 
              class="flex items-center justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50/50 -mx-2 px-2 rounded-lg transition-colors"
              @click="router.push(`/tasks/${task.id}`)"
            >
              <div class="flex items-center gap-4">
                <div class="h-9 w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                  {{ task.title.substring(0, 2).toUpperCase() }}
                </div>
                <div class="space-y-1">
                  <p class="text-sm font-medium leading-none">{{ task.title }}</p>
                  <p class="text-xs text-muted-foreground">Created: {{ new Date(task.createdAt).toLocaleDateString() }}</p>
                </div>
              </div>
              <div class="text-xs font-medium px-2.5 py-0.5 rounded-full"
                :class="{
                  'bg-yellow-100 text-yellow-700': task.status === 'draft',
                  'bg-blue-100 text-blue-700': task.status === 'generated',
                  'bg-emerald-100 text-emerald-700': task.status === 'published'
                }"
              >
                {{ task.status.charAt(0).toUpperCase() + task.status.slice(1) }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-span-3 rounded-xl border border-border/50 bg-card text-card-foreground shadow-sm">
        <div class="p-6 pb-3">
           <h3 class="text-lg font-semibold leading-none tracking-tight">{{ $t('dashboard.systemStatus.title') }}</h3>
           <p class="text-sm text-muted-foreground mt-1.5">{{ $t('dashboard.systemStatus.engine') }}</p>
        </div>
        <div class="p-6 pt-0 space-y-4">
          <div class="flex items-center justify-between">
             <div class="flex items-center gap-2 text-sm">
                <div class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>{{ $t('dashboard.systemStatus.crawler') }}</span>
             </div>
             <span class="text-xs text-muted-foreground">{{ $t('dashboard.systemStatus.idle') }}</span>
          </div>
          <div class="flex items-center justify-between">
             <div class="flex items-center gap-2 text-sm">
                <div class="h-2 w-2 rounded-full bg-emerald-500"></div>
                <span>AI Agent (GLM-5)</span>
             </div>
             <span class="text-xs text-emerald-600 font-medium">{{ $t('dashboard.systemStatus.online') }}</span>
          </div>
           <div class="flex items-center justify-between">
             <div class="flex items-center gap-2 text-sm">
                <div class="h-2 w-2 rounded-full bg-emerald-500"></div>
                <span>Database (Turso)</span>
             </div>
             <span class="text-xs text-emerald-600 font-medium">{{ $t('dashboard.systemStatus.connected') }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
