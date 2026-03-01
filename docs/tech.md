# 技术设计

## 项目组织
- 使用 monorepo 来组织项目，前端和后端分别在不同的子目录中。
- 前后端项目都使用 bun 来管理依赖

## 前端技术栈
- Vue + TypeScript + Vite + Bun
- 智谱 AI API
- markstream-vue 渲染 Markdown

## 后端技术栈
- Bun + elysia
- AI 使用 longchainjs,langchainjsmcp 来配置AI技能，来抓取和总结内容
- AI 供应商使用七牛云提供的能力
- 使用数据库 turso 存储数据
- 敏感配置可以使用环境变量控制，也支持在管理面板中配置
