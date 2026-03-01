import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
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

  async summarizeContent(url: string, content?: string, targetLang?: string) {
    console.log(`Summarizing content for ${url} in ${targetLang}`);
    
    let textToSummarize = content;

    if (!textToSummarize) {
      try {
        const loader = new CheerioWebBaseLoader(url);
        const docs = await loader.load();
        textToSummarize = docs.map(doc => doc.pageContent).join('\n');
      } catch (e) {
        console.error("Error fetching content:", e);
        return "Failed to fetch content for summarization.";
      }
    }

    if (!textToSummarize) {
      return "No content available to summarize.";
    }

    // Truncate if too long
    const truncatedText = textToSummarize.substring(0, 10000); 

    const prompt = `Please provide a concise summary of the following article content in ${targetLang || 'the original language'}. Focus on the key points.
Content:
${truncatedText}`;

    try {
      const messages = [
        new SystemMessage("You are a helpful assistant that summarizes articles."),
        new HumanMessage(prompt),
      ];
      const response = await model.invoke(messages);
      return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    } catch (error) {
      console.error("Error summarizing content:", error);
      return "Error generating summary.";
    }
  }

  async generateDraft(taskId: string, articles: any[], template: string) {
    console.log(`Generating draft for task ${taskId}`);
    
    // Construct the prompt
    const articlesText = articles.map((a, i) => 
      `Article ${i+1}:\nTitle: ${a.title}\nContent: ${a.content || a.aiSummary || 'No content'}`
    ).join('\n\n');
    
    const prompt = `
You are a professional content curator.
Your task is to generate a newsletter draft based on the following articles and template.

Template:
${template}

Articles:
${articlesText}

Please output the final Markdown content.
    `;

    try {
      // In a real scenario, we might want to use a chain or agent with tools.
      // For generation, a direct call might be sufficient or a simple chain.
      const messages = [
        new SystemMessage("You are a helpful assistant that curates content."),
        new HumanMessage(prompt),
      ];

      // For streaming, we would return a stream.
      // Here we just await for simplicity as a starting point.
      const response = await model.invoke(messages);
      
      return response.content;
    } catch (error) {
      console.error("Error generating draft:", error);
      return "Error generating draft. Please check backend logs.";
    }
  }
}

export const agentService = new AgentService();
