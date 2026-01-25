/**
 * API RAG BNCC - Consulta inteligente à Base Nacional Comum Curricular
 * 
 * Esta API utiliza RAG (Retrieval Augmented Generation) para consultar o documento
 * da BNCC e gerar contextos pedagógicos enriquecidos com cultura digital.
 * 
 * Tecnologias:
 * - LlamaIndex: Framework RAG para busca semântica em documentos
 * - OpenAI: GPT-4o-mini para geração de texto e text-embedding-3-small para embeddings
 * - Express: Servidor HTTP para API REST
 * 
 * @version 2.0.0 - Arquitetura Refatorada
 */

import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import { initSettings } from "./app/settings";
import { Settings } from "llamaindex";
import { gerarContextoController } from "./controllers/context.controller";

// ==================== CONFIGURAÇÃO DO SERVIDOR ====================

const app = express();
const PORT = process.env.API_PORT || 5251;

// Opções do CORS para produção
const corsOptions = {
  origin: process.env.API_CENTRAL || false, // Permite apenas requisições deste domínio
  optionsSuccessStatus: 200 // Para navegadores mais antigos
};

// Middlewares
app.use(cors(corsOptions)); // Usa as opções configuradas
app.use(express.json());

// Inicializa configurações do LLM e embeddings
initSettings();
console.log("✅ Settings inicializado");

// ==================== ROTAS ====================

/**
 * POST /api/gerar-contexto
 * Gera contexto pedagógico estruturado a partir da BNCC
 */
app.post("/api/gerar-contexto", gerarContextoController);

/**
 * GET /api/health
 * Health check da API
 */
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "RAG - BNCC + Cultura Digital",
    version: "2.0.0",
    llm: Settings.llm?.constructor.name,
    timestamp: new Date().toISOString()
  });
});

// ==================== INICIALIZAÇÃO ====================

app.listen(PORT, () => {
  console.log(`\n🚀 API RAG rodando em http://localhost:${PORT}`);
  console.log(`\n📡 Endpoints disponíveis:`);
  console.log(`   POST /api/gerar-contexto - Gera contexto pedagógico`);
  console.log(`   GET  /api/health          - Health check`);
  console.log(`\n📚 Base de dados: BNCC + Cultura Digital`);
  console.log(`🏗️  Arquitetura: Modular (Services + Controllers + Utils)\n`);
});