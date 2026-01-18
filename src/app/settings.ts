import { OpenAI, OpenAIEmbedding } from "@llamaindex/openai";
import { Settings } from "llamaindex";

export function initSettings() {
  console.log("Initializing Settings...");
  console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
  console.log("MODEL:", process.env.MODEL);
  
  Settings.llm = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.MODEL ?? "gpt-4o-mini",
    maxTokens: process.env.LLM_MAX_TOKENS
      ? Number(process.env.LLM_MAX_TOKENS)
      : undefined,
  });
  
  Settings.embedModel = new OpenAIEmbedding({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
    dimensions: process.env.EMBEDDING_DIM
      ? parseInt(process.env.EMBEDDING_DIM)
      : undefined,
  });
  
  console.log("Settings initialized successfully");
  console.log("Settings.llm:", Settings.llm?.constructor.name);
}
