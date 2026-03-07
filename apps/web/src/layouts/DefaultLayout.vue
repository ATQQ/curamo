<script setup lang="ts">
import { 
  LayoutDashboard, 
  Rss, 
  BookOpen, 
  ListTodo, 
  Settings,
  Plus,
  Languages
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { locale } = useI18n()
const router = useRouter()

const toggleLanguage = () => {
  locale.value = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
}

const handleNewCuration = () => {
  router.push({ path: '/tasks', query: { action: 'new', t: Date.now().toString() } })
}
</script>

<template>
  <div class="flex h-screen bg-background text-foreground font-sans antialiased">
    <!-- Sidebar -->
    <aside class="w-64 border-r border-border/40 bg-muted/10 flex flex-col">
      <div class="p-6 pb-4">
        <h1 class="text-xl font-bold flex items-center gap-2 text-primary tracking-tight">
          <div class="bg-primary/10 p-1.5 rounded-lg">
            <BookOpen class="w-5 h-5 text-primary" />
          </div>
          {{ $t('app.name') }}
        </h1>
      </div>
      
      <div class="px-4 mb-4">
        <Button class="w-full justify-start gap-2 shadow-sm" size="sm" @click="handleNewCuration">
          <Plus class="w-4 h-4" />
          {{ $t('nav.newCuration') }}
        </Button>
      </div>

      <nav class="space-y-1 px-3 flex-1">
        <div class="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {{ $t('nav.overview') }}
        </div>
        <router-link 
          to="/" 
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
          exact-active-class="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
        >
          <LayoutDashboard class="w-4 h-4" />
          {{ $t('nav.dashboard') }}
        </router-link>
        
        <div class="mt-6 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {{ $t('nav.content') }}
        </div>
        <router-link 
          to="/sources" 
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
          active-class="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
        >
          <Rss class="w-4 h-4" />
          {{ $t('nav.sources') }}
        </router-link>
        <router-link 
          to="/articles" 
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
          active-class="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
        >
          <BookOpen class="w-4 h-4" />
          {{ $t('nav.articles') }}
        </router-link>
        
        <div class="mt-6 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {{ $t('nav.workspace') }}
        </div>
        <router-link 
          to="/tasks" 
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
          active-class="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
        >
          <ListTodo class="w-4 h-4" />
          {{ $t('nav.tasks') }}
        </router-link>
        <router-link 
          to="/settings" 
          class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
          active-class="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
        >
          <Settings class="w-4 h-4" />
          {{ $t('nav.settings') }}
        </router-link>
      </nav>
      
      <div class="p-4 border-t border-border/40 flex justify-between items-center">
        <div class="text-xs text-muted-foreground/60">
          <span>{{ $t('app.version') }}</span>
          <span class="block opacity-50">{{ $t('app.poweredBy') }}</span>
        </div>
        <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-foreground" @click="toggleLanguage">
          <Languages class="h-4 w-4" />
        </Button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto bg-background/50">
      <div class="container mx-auto py-8 px-8 max-w-7xl animate-in fade-in duration-500">
        <router-view />
      </div>
    </main>
  </div>
</template>
