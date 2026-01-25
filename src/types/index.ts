/**
 * Tipos e Interfaces da API RAG BNCC
 * Centraliza todas as definições de tipos do sistema
 */

// ==================== ENUMS ====================

/** Nível escolar da BNCC */
export type NivelEscolar = "fundamental" | "medio";

// ==================== INTERFACES ====================

/** Habilidade da BNCC com código e descrição */
export interface Habilidade {
  codigo: string;
  descricao: string;
}

/** Requisição do endpoint gerar-contexto */
export interface GerarContextoRequest {
  tema: string;
  disciplina: string;
  serie: string;
  bimestre?: string;
}

/** Nó retornado pelo RAG */
export interface RAGNode {
  node?: {
    text?: string;
    metadata?: {
      page_number?: number;
    };
  };
  score?: number;
}

/** Nó enriquecido após filtragem */
export interface EnrichedNode extends RAGNode {
  matchCount: number;
  penalizacaoNivel: number;
  boostedScore: number;
  nivelCorreto: boolean;
}

/** Resultado da consulta ao RAG */
export interface RAGQueryResult {
  response: string;
  sourceNodes: RAGNode[];
}

/** Resultado completo da consulta multi-query */
export interface MultiQueryResult {
  response: string;
  sourceNodes: EnrichedNode[];
  queries: string[];
  habilidades: Habilidade[];
}

/** Fonte da BNCC consultada */
export interface FonteBNCC {
  pagina?: number;
  score?: string;
}

/** Contexto pedagógico gerado pela IA */
export interface ContextoPedagogico {
  tema: string;
  serie: string;
  disciplina: string;
  habilidadesBNCC: Habilidade[];
  contextoPedagogico: {
    abordagem: string;
    nivelCognitivo: string;
    estrategias: string[];
    metodologias: string[];
  };
  culturaDigital: {
    relacao: string;
    tecnologias: string[];
    recursos: string[];
    competenciasDigitais: string[];
  };
  sugestoesConteudo: string[];
}

/** Resposta do endpoint gerar-contexto */
export interface GerarContextoResponse {
  contexto: ContextoPedagogico;
  bnccReferencia: string;
  fontes: FonteBNCC[];
  metadata: {
    tema: string;
    disciplina: string | null;
    serie: string | null;
    bimestre: string | null;
    timestamp: string;
  };
}
