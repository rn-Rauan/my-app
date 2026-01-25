/**
 * Configuração dos modelos de IA (LLM e Embeddings)
 *
 * Este módulo inicializa:
 * - LLM (Large Language Model): GPT-4o-mini da OpenAI para geração de texto
 * - Embedding Model: text-embedding-3-small para vetorização semântica
 *
 * As configurações são carregadas do arquivo .env
 */
import { OpenAI, OpenAIEmbedding } from "@llamaindex/openai";
import { Settings } from "llamaindex";
/**
 * Inicializa as configurações globais de LLM e Embeddings
 *
 * Carrega variáveis de ambiente e configura:
 * - Settings.llm: Modelo de linguagem para geração de texto
 * - Settings.embedModel: Modelo para criar embeddings vetoriais
 *
 * @throws {Error} Se OPENAI_API_KEY não estiver definida no .env
 */
export function initSettings() {
    console.log("Initializing Settings...");
    console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
    console.log("MODEL:", process.env.MODEL);
    // Configura o modelo de linguagem (LLM) para geração de texto
    Settings.llm = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY, // Chave da API OpenAI
        model: process.env.MODEL ?? "gpt-4o-mini", // Modelo padrão: GPT-4o-mini (rápido e econômico)
        maxTokens: process.env.LLM_MAX_TOKENS
            ? Number(process.env.LLM_MAX_TOKENS)
            : undefined, // Limite de tokens por resposta (opcional)
    });
    // Configura o modelo de embeddings para busca semântica
    Settings.embedModel = new OpenAIEmbedding({
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small", // Modelo de embedding compacto
        dimensions: process.env.EMBEDDING_DIM
            ? parseInt(process.env.EMBEDDING_DIM)
            : undefined, // Dimensão do vetor (padrão: 1536 para text-embedding-3-small)
    });
    console.log("Settings initialized successfully");
    console.log("Settings.llm:", Settings.llm?.constructor.name);
}
