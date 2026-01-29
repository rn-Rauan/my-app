/**
 * Serviço RAG - Retrieval Augmented Generation
 * Gerencia consultas semânticas à BNCC usando LlamaIndex
 */

import { getIndex } from "../app/data";
import { RAGQueryResult, MultiQueryResult } from "../types";
import { detectarNivelEscolar, detectarAreaBNCC, extrairNumeroAno } from "../utils/validators";
import { 
  filtrarNodesPorRelevancia, 
  extrairHabilidadesBNCC, 
  removerNodesDuplicados 
} from "../utils/filters";

// Cache do query engine (inicializado uma vez)
let queryEngine: any = null;

/**
 * Inicializa o Query Engine do LlamaIndex
 * Carrega o índice vetorial da BNCC e configura o retriever
 */
async function initializeQueryEngine() {
  if (!queryEngine) {
    const index = await getIndex();
    
    queryEngine = {
      index,
      async query(params: { query: string }): Promise<RAGQueryResult> {
        console.log(`      🔎 Executando query no LlamaIndex: "${params.query}"`);
        const retriever = index.asRetriever({ 
          similarityTopK: 60, // Aumentado para 60 para melhorar recall
        });
        
        const nodes = await retriever.retrieve(params.query);
        console.log(`      ✅ Query retornou ${nodes.length} nós.`);
        
        const responseSynthesizer = index.asQueryEngine().responseSynthesizer;
        // Ignoramos a síntese completa para economizar tokens, focando na recuperação
        /*
        const response = await responseSynthesizer.synthesize({
          query: params.query,
          nodes,
        });
        */
        
        return {
          response: "Síntese desativada para otimização",
          sourceNodes: nodes,
        };
      }
    };
    
    console.log("✅ Query Engine inicializado");
  }
  
  return queryEngine;
}

/**
 * Consulta a BNCC usando múltiplas queries para maior precisão
 * 
 * Estratégia multi-query:
 * 1. Habilidades específicas do tema
 * 2. Objetos de conhecimento relacionados
 * 3. Competências gerais da etapa
 * 
 * Benefícios:
 * - Maior cobertura do conteúdo
 * - Reduz viés de uma única query
 * - Melhora recall mantendo precision
 */
export async function consultarBNCC(
  tema: string,
  disciplina: string,
  serie: string,
  anoSerie: string
): Promise<MultiQueryResult> {
  const engine = await initializeQueryEngine();
  const nivelEscolar = detectarNivelEscolar(serie);
  const areaBNCC = detectarAreaBNCC(disciplina, nivelEscolar);
  const anoEsperado = extrairNumeroAno(serie);
  
  // Log para debug
  console.log(`   📚 Disciplina: ${disciplina} → Código BNCC: ${areaBNCC || "não identificada"} (${nivelEscolar})`);
  if (anoEsperado !== null) {
    console.log(`   📅 Série: ${serie} → Ano: ${anoEsperado}`);
  }
  
  // Gera queries mais específicas incluindo o código da área quando disponível
  const queries = [];
  
  if (nivelEscolar === "medio" && areaBNCC) {
    // Para Ensino Médio com área identificada, inclui o código (CHS, LGG, MAT, CNT)
    queries.push(
      `${anoSerie} ${serie} ${areaBNCC} ${disciplina} ${tema} habilidades competências`,
      `Ensino Médio ${areaBNCC} ${tema} objetos conhecimento`,
      `EM13${areaBNCC} ${disciplina} ${tema}`,
    );
  } else if (nivelEscolar === "fundamental" && anoEsperado !== null && areaBNCC) {
    // Para Ensino Fundamental com ano específico e disciplina identificada
    // Usa código de 2 letras: CI (Ciências), HI (História), GE (Geografia), etc.
    const codigoAno = anoEsperado.toString().padStart(2, '0'); // 9 → "09"
    queries.push(
      `${serie} ${disciplina} ${tema} habilidades EF${codigoAno}${areaBNCC}`,
      `EF${codigoAno}${areaBNCC} ${disciplina} ${tema}`,
      `${anoEsperado}º ano ${disciplina} ${tema} objetos conhecimento`,
      `${tema} EF${codigoAno}${areaBNCC}`, // Query focada em tema + código
      disciplina.toLowerCase().includes("ingl") ? `${tema}` : `${tema} BNCC` // Query ampla ou específica para inglês
    );
  } else {
    // Queries genéricas para outros casos
    queries.push(
      `${anoSerie} ${serie} ${disciplina} ${tema} habilidades`,
      `${anoSerie} ${disciplina} ${serie} ${tema} objetos conhecimento`,
      `${anoSerie} ${disciplina} competências ${tema} ${serie}`,
    );
  }

  console.log("   Executando múltiplas queries...");
  
  // Executa queries em sequência
  const results = [];
  for (let i = 0; i < queries.length; i++) {
    console.log(`   Query ${i + 1}: "${queries[i]}"`);
    try {
      const response = await engine.query({ query: queries[i] });
      console.log(`   ✅ Query ${i + 1} concluída`);
      results.push({
        query: queries[i],
        response: response.response,
        nodes: response.sourceNodes || []
      });
    } catch (e) {
      console.error(`   ❌ Erro na Query ${i + 1}:`, e);
    }
  }

  // Agrega todos os nós retornados
  const allNodes = results.flatMap(r => r.nodes);
  
  // Aplica filtros de relevância por nível escolar, área e ano
  console.log(`   🔍 Aplicando filtros: nível=${nivelEscolar}, área=${areaBNCC || "N/A"}, ano=${anoEsperado || "N/A"}`);
  const nodesFiltrados = filtrarNodesPorRelevancia(allNodes, tema, disciplina, serie, areaBNCC);
  
  console.log(`   📊 Nós: ${allNodes.length} → ${nodesFiltrados.length} (após filtro)`);
  
  // Remove duplicatas e pega top 10
  const uniqueNodes = removerNodesDuplicados(nodesFiltrados, 10);

  // Combina respostas
  const combinedResponse = results.map(r => r.response).join('\n\n');
  
  // Extrai habilidades (apenas do nível, área e ano corretos)
  const habilidades = extrairHabilidadesBNCC(uniqueNodes, nivelEscolar, areaBNCC, anoEsperado);

  return {
    response: combinedResponse,
    sourceNodes: uniqueNodes,
    queries,
    habilidades
  };
}
