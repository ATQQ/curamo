import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

// Initialize the model
// User should configure OPENAI_API_KEY and OPENAI_BASE_URL in .env
// For Zhipu AI (GLM-5), base URL would be needed.
const model = new ChatOpenAI({
  modelName: process.env.AI_API_MODEL || "gpt-3.5-turbo",
  temperature: 0.7,
  openAIApiKey: process.env.AI_API_KEY || "dummy-key",
  configuration: {
    baseURL: process.env.AI_API_BASE,
    apiKey: process.env.AI_API_KEY,
  },
});

export class AgentService {
  /**
   * 通过 Jina Reader API 或 Cheerio 抓取文章正文，返回干净的文本内容
   */
  async fetchArticleContent(url: string): Promise<string | null> {
    // 1. Jina Reader API（优先）
    try {
      const jinaUrl = `https://r.jina.ai/${url}`;
      const headers: Record<string, string> = {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown',
        'X-No-Cache': 'true',
      };
      if (process.env.JINA_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;
      }
      const resp = await fetch(jinaUrl, {
        headers,
        signal: AbortSignal.timeout(20000),
      });
      if (resp.ok) {
        const text = await resp.text();
        if (text.trim().length > 100) {
          console.log(`[Jina] fetched ${text.length} chars for ${url}`);
          return text;
        }
      }
    } catch (e) {
      console.warn('[Jina] Reader failed, falling back to Cheerio:', e);
    }

    // 2. Cheerio 兜底，优先匹配语义化正文标签
    try {
      const loader = new CheerioWebBaseLoader(url, {
        selector: "article, main, [role='main'], .post-content, .article-content, .entry-content, .content, body",
      });
      const docs = await loader.load();
      const text = docs.map(doc => doc.pageContent).join('\n');
      console.log(`[Cheerio] fetched ${text.length} chars for ${url}`);
      return text || null;
    } catch (e) {
      console.error('[Cheerio] Error fetching content:', e);
      return null;
    }
  }

  async translateTitle(title: string, targetLang: string) {
    console.log(`Translating title: ${title} to ${targetLang}`);
    const prompt = `Translate the following article title to ${targetLang}. Only return the translated title, no other text.
Title: ${title}`;
    
    try {
      const messages = [
        new SystemMessage("You are a professional translator."),
        new HumanMessage(prompt),
      ];
      const response = await model.invoke(messages);
      return response.content;
    } catch (error) {
      console.error("Error translating title:", error);
      return title; // Fallback to original
    }
  }

  async summarizeContent(
    url: string, 
    content?: string, 
    targetLang?: string, 
    templateContent?: string, 
    extraPrompt?: string
  ) {
    console.log(`Summarizing content for ${url} in ${targetLang}`);
    
    let textToSummarize = content;

    if (!textToSummarize) {
      const fetched = await this.fetchArticleContent(url);
      if (!fetched) return "Failed to fetch content for summarization.";
      textToSummarize = fetched;
    }

    if (!textToSummarize.trim()) {
      return "No content available to summarize.";
    }

    // 提高上限至 50000 字符，避免极端情况下超出模型上下文
    const MAX_CHARS = 50000;
    console.log(`Content length: ${textToSummarize.length} chars`);
    const truncatedText = textToSummarize.length > MAX_CHARS
      ? textToSummarize.substring(0, MAX_CHARS) + '\n\n[Content truncated due to length]'
      : textToSummarize;

    const outputLang = targetLang || '中文';

    let instructions = templateContent
      ? `你是一位专业的技术周刊编辑。请根据以下模板格式，对文章内容进行总结，用 ${outputLang} 输出。严格遵循模板结构，不要添加模板之外的内容。\n\n输出模板：\n${templateContent}`
      : `你是一位专业的技术周刊编辑。请用 ${outputLang} 对以下文章进行简洁总结（2-4句话），突出核心价值和亮点，适合放入技术周刊供读者快速了解。只输出摘要正文，不要输出标题或链接。`;

    if (extraPrompt) {
      instructions = `${instructions}\n\n额外要求：${extraPrompt}`;
    }

    const prompt = `${instructions}

来源链接：${url}

文章内容：
${truncatedText}`;

    try {
      const messages = [
        new SystemMessage("你是一位专业的技术周刊编辑，擅长用简洁的中文提炼技术文章的核心价值。"),
        new HumanMessage(prompt),
      ];
      const response = await model.invoke(messages);
      return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } catch (error) {
      console.error("Error summarizing content:", error);
      return "Error generating summary.";
    }
  }

  async generateDraft(taskId: string, articles: any[], templateContent: string, templatePrompt?: string, extraPrompt?: string) {
    console.log(`Generating draft for task ${taskId}`);

    const articlesText = articles.map((a, i) => {
      const title = a.translatedTitle || a.title;
      const summary = a.aiSummary || (a.content ? a.content.substring(0, 800) : '暂无摘要');
      return `文章 ${i + 1}:\n标题：${title}\n链接：${a.url}\n摘要：${summary}`;
    }).join('\n\n---\n\n');

    const baseSystemPrompt = `你是一位专业的技术周刊编辑，擅长将零散技术文章整理成结构清晰、面向开发者的高质量周刊内容。

【分类规则】
- 🔥强烈推荐：本周最值得阅读的内容（1-3篇），具有重大价值、突破性意义或强烈的实用性
- 🔧开源工具&技术资讯：新发布的开源项目、框架、库、SDK 或重要技术动态
- 📚教程&文章：技术教程、深度分析、最佳实践、架构设计类内容
- 🤖AI工具&资讯：AI 相关的工具、模型发布、产品更新和行业动态

【写作规范】
1. 每篇文章摘要控制在 2-4 句话，简洁专业，突出核心价值
2. 标题优先使用中文翻译版本，保留文章原始 URL 作为链接
3. 摘要用中文书写，专业术语、产品名、框架名可保留英文
4. 同一分类内的文章按重要程度降序排列
5. 某个分类若无合适文章则省略该分类，不要保留空分类
6. 严格按模板格式输出，不添加任何前言、解释或结尾说明`;

    let systemPrompt = templatePrompt
      ? `${baseSystemPrompt}\n\n【模板要求】\n${templatePrompt}`
      : baseSystemPrompt;
    
    if (extraPrompt) {
        systemPrompt = `${systemPrompt}\n\n【本次生成额外要求】\n${extraPrompt}`;
    }

    const userPrompt = `请将以下文章整理成周刊草稿，严格遵循下方模板的格式和分区结构，直接输出完整的 Markdown 内容。

【输出模板】
${templateContent}

【文章列表】
${articlesText}`;

    try {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ];

      const response = await model.invoke(messages);
      return response.content;
    } catch (error) {
      console.error("Error generating draft:", error);
      return "Error generating draft. Please check backend logs.";
    }
  }

  async refineContent(content: string, instruction: string) {
    console.log(`Refining content with instruction: ${instruction}`);
    
    const systemPrompt = `你是一位专业的技术周刊编辑。请根据用户的修改指令，对已有的周刊内容进行修改和润色。
请直接输出修改后的完整 Markdown 内容，不要包含任何解释、确认或前言后缀。保持原有的格式和结构，除非指令要求改变。`;

    const userPrompt = `【原始内容】
${content}

【修改指令】
${instruction}

请根据指令修改上述内容，直接输出结果。`;

    try {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ];
      const response = await model.invoke(messages);
      return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } catch (error) {
      console.error("Error refining content:", error);
      return "Error refining content.";
    }
  }
}

export const agentService = new AgentService();
