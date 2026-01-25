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
 * @author Sistema RAG BNCC
 * @version 1.0.0
 */

import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import { initSettings } from "./app/settings";
import { getIndex } from "./app/data";
import { Settings } from "llamaindex";

// Inicialização do servidor Express
const app = express();
const PORT = process.env.API_PORT || 3001;

// Middlewares
app.use(cors()); // Permite requisições de qualquer origem
app.use(express.json()); // Parser para JSON no body das requisições

// Inicializa configurações do LLM e embeddings
initSettings();
console.log("✅ Settings inicializado");

// Cache do query engine (inicializado sob demanda)
let queryEngine: any = null;

/**
 * Inicializa o Query Engine customizado com retriever semântico
 * 
 * O Query Engine é responsável por:
 * 1. Carregar o índice vetorial da BNCC do storage
 * 2. Configurar retriever com busca por similaridade (top 20 resultados)
 * 3. Sintetizar respostas usando os documentos mais relevantes
 * 
 * @returns {Promise<Object>} Query engine configurado e pronto para uso
 */
async function initializeQueryEngine() {
  if (!queryEngine) {
    const index = await getIndex();
    
    // Query engine customizado com retriever de alta precisão
    queryEngine = {
      index,
      async query(params: { query: string }) {
        // Busca semântica: encontra os 20 trechos mais similares no vetor store
        const retriever = index.asRetriever({ 
          similarityTopK: 20, // Busca mais resultados para aplicar filtros posteriormente
        });
        
        const nodes = await retriever.retrieve(params.query);
        
        // Sintetiza resposta
        const responseSynthesizer = index.asQueryEngine().responseSynthesizer;
        const response = await responseSynthesizer.synthesize({
          query: params.query,
          nodes,
        });
        
        return {
          response: response.response,
          sourceNodes: nodes,
        };
      }
    };
    
    console.log("✅ Query Engine inicializado com retriever customizado");
  }
  return queryEngine;
}

/**
 * Detecta o nível escolar baseado na série informada
 * 
 * @param serie - Série escolar (ex: "3º ANO" ou "2ª SÉRIE")
 * @returns "fundamental" ou "medio"
 */
function detectarNivelEscolar(serie: string): "fundamental" | "medio" {
  const serieUpper = serie.toUpperCase();
  if (serieUpper.includes("SÉRIE") || serieUpper.includes("SERIE")) {
    return "medio";
  }
  return "fundamental";
}

/**
 * Valida se o código de habilidade é compatível com o nível escolar
 * 
 * @param codigo - Código da habilidade (ex: "EF03MA01" ou "EM13MAT302")
 * @param nivelEscolar - "fundamental" ou "medio"
 * @returns true se compatível, false caso contrário
 */
function validarHabilidadeNivel(codigo: string, nivelEscolar: "fundamental" | "medio"): boolean {
  if (nivelEscolar === "medio") {
    return codigo.startsWith("EM");
  } else {
    return codigo.startsWith("EF");
  }
}

/**
 * Aplica filtro híbrido (semântico + palavras-chave) nos nós recuperados
 * 
 * Este filtro aumenta a precisão do RAG combinando:
 * - Similaridade semântica (scores do embedding)
 * - Correspondência de palavras-chave (tema, disciplina, série)
 * - Boost para matches exatos de disciplina (+3 pontos)
 * - Boost para matches de ano/série (+2 pontos)
 * - NOVO: Filtro rigoroso por nível escolar (Fundamental vs Médio)
 * - NOVO: Penalização severa para nós do nível escolar errado (-50 pontos)
 * 
 * @param nodes - Nós retornados pelo retriever semântico
 * @param tema - Tema educacional buscado
 * @param disciplina - Disciplina da BNCC (ex: "MATEMÁTICA")
 * @param serie - Série escolar (ex: "3º ANO" ou "2º SÉRIE")
 * @returns Array de nós filtrados e ordenados por relevância
 */
function filtrarNodesPorRelevancia(
  nodes: any[],
  tema: string,
  disciplina: string,
  serie: string
): any[] {
  const nivelEscolar = detectarNivelEscolar(serie);
  
  // Extrai palavras-chave relevantes do contexto da busca
  const palavrasChave = [
    ...tema.toLowerCase().split(' '),
    disciplina.toLowerCase(),
    ...serie.toLowerCase().split(' ').filter(p => p.match(/\d/)), // Números da série (ex: "3" de "3º ANO")
  ];
  
  // Palavras-chave que indicam nível escolar errado
  const palavrasNivelErrado = nivelEscolar === "medio" 
    ? ["ensino fundamental", "anos iniciais", "anos finais", "fundamental ii"]
    : ["ensino médio", "ensino medio"];
  
  return nodes
    .map((node: any) => {
      const texto = node.node?.text?.toLowerCase() || '';
      
      // Conta quantas palavras-chave aparecem
      let matchCount = 0;
      for (const palavra of palavrasChave) {
        if (palavra.length > 2 && texto.includes(palavra)) {
          matchCount++;
        }
      }
      
      // Boost se menciona a disciplina
      if (texto.includes(disciplina.toLowerCase())) {
        matchCount += 3;
      }
      
      // Boost se menciona ano/série específico
      const anoMatch = serie.match(/(\d+)º/);
      if (anoMatch && texto.includes(anoMatch[1])) {
        matchCount += 2;
      }
      
      // NOVO: Detecta códigos de habilidade no texto do nó
      const regexHabilidades = /(EF\d{2}[A-Z]{2}\d{2}|EM\d{2}[A-Z]{3}\d{2,3})/g;
      const codigosEncontrados = texto.match(regexHabilidades) || [];
      
      // NOVO: Penalização severa se encontrar códigos do nível errado
      let penalizacaoNivel = 0;
      for (const codigo of codigosEncontrados) {
        const codigoUpper = codigo.toUpperCase();
        if (!validarHabilidadeNivel(codigoUpper, nivelEscolar)) {
          penalizacaoNivel -= 50; // Penalização severa!
        } else {
          matchCount += 5; // Boost forte para códigos corretos
        }
      }
      
      // NOVO: Penalização se mencionar o nível escolar errado
      for (const palavraErrada of palavrasNivelErrado) {
        if (texto.includes(palavraErrada)) {
          penalizacaoNivel -= 20;
        }
      }
      
      // NOVO: Boost se mencionar o nível escolar correto
      const palavraNivelCorreto = nivelEscolar === "medio" 
        ? "ensino médio"
        : "ensino fundamental";
      if (texto.includes(palavraNivelCorreto)) {
        matchCount += 4;
      }
      
      return {
        ...node,
        matchCount,
        penalizacaoNivel,
        boostedScore: (Math.abs(node.score || 0) * 100) + matchCount + penalizacaoNivel,
        nivelCorreto: penalizacaoNivel >= 0 || codigosEncontrados.length === 0
      };
    })
    .filter((node: any) => {
      // Remove nós com penalização muito alta (claramente do nível errado)
      if (node.penalizacaoNivel < -30) return false;
      // Mantém apenas se tiver algum match ou não tiver código de nível errado
      return node.matchCount > 0 || node.nivelCorreto;
    })
    .sort((a: any, b: any) => b.boostedScore - a.boostedScore);
}

/**
 * Extrai códigos de habilidades da BNCC dos nós recuperados
 * 
 * A BNCC usa códigos padronizados para identificar habilidades:
 * - Ensino Fundamental: EF[ano][disciplina][número] (ex: EF03MA01)
 *   Formato: EF + 2 dígitos (ano) + 2 letras (disciplina) + 2 dígitos (sequencial)
 * - Ensino Médio: EM[etapa][disciplina][número] (ex: EM13MAT302)
 *   Formato: EM + 2 dígitos (etapa) + 3 letras (área) + 2-3 dígitos (sequencial)
 * 
 * A função:
 * 1. Busca códigos usando regex nos textos dos nós
 * 2. Extrai a descrição que segue cada código
 * 3. Remove duplicatas mantendo a descrição mais completa
 * 4. NOVO: Filtra apenas habilidades do nível escolar correto
 * 5. Retorna apenas as 2 habilidades mais relevantes
 * 
 * @param nodes - Nós do RAG contendo texto da BNCC
 * @param nivelEscolar - Nível escolar esperado ("fundamental" ou "medio")
 * @returns Array com até 2 habilidades (código + descrição)
 */
function extrairHabilidadesBNCC(
  nodes: any[], 
  nivelEscolar: "fundamental" | "medio"
): Array<{codigo: string, descricao: string}> {
  const habilidades: Map<string, string> = new Map();
  
  // Regex para capturar códigos de habilidades (Fundamental e Médio)
  // EF: EF03MA01 (EF + 2 dígitos + 2 letras + 2 dígitos)
  // EM: EM13MAT302 (EM + 2 dígitos + 3 letras + 2-3 dígitos)
  const regex = /(EF\d{2}[A-Z]{2}\d{2}|EM\d{2}[A-Z]{3}\d{2,3})/g;
  
  for (const node of nodes) {
    const texto = node.node?.text || '';
    let match;
    
    while ((match = regex.exec(texto)) !== null) {
      const codigo = match[0]; // match[0] é o código completo (EF03MA01 ou EM13MAT302)
      
      // Extrai a descrição: busca texto após o código até encontrar nova linha ou outro código
      const startIdx = match.index + codigo.length;
      let endIdx = texto.indexOf('\n', startIdx);
      if (endIdx === -1) endIdx = texto.length;
      
      // Verifica se há outro código antes da quebra de linha
      const nextMatch = texto.substring(startIdx, endIdx).search(/(EF\d{2}[A-Z]{2}\d{2}|EM\d{2}[A-Z]{3}\d{2,3})/);
      if (nextMatch !== -1) {
        endIdx = startIdx + nextMatch;
      }
      
      let descricao = texto.substring(startIdx, endIdx)
        .replace(/^\s*[-–—):\s]+/, '') // Remove caracteres iniciais
        .trim();
      
      // Limita descrição a 200 chars
      if (descricao.length > 200) {
        descricao = descricao.substring(0, 200) + '...';
      }
      
      // Só adiciona se tiver descrição válida
      if (descricao.length > 10) {
        // Guarda apenas se ainda não tem ou se a descrição é maior
        if (!habilidades.has(codigo) || habilidades.get(codigo)!.length < descricao.length) {
          habilidades.set(codigo, descricao);
        }
      }
    }
  }
  
  // NOVO: Filtra apenas habilidades do nível correto
  const habilidadesFiltradas = Array.from(habilidades.entries())
    .filter(([codigo]) => validarHabilidadeNivel(codigo, nivelEscolar));
  
  // Log de habilidades descartadas por nível incorreto
  const habilidadesDescartadas = Array.from(habilidades.entries())
    .filter(([codigo]) => !validarHabilidadeNivel(codigo, nivelEscolar));
  
  if (habilidadesDescartadas.length > 0) {
    console.log(`   ⚠️  ${habilidadesDescartadas.length} habilidade(s) descartada(s) por nível incorreto:`);
    habilidadesDescartadas.forEach(([codigo]) => {
      console.log(`      ❌ ${codigo} (esperado: ${nivelEscolar === "medio" ? "EM" : "EF"})`);
    });
  }
  
  // Retorna apenas as 2 primeiras habilidades do nível correto
  return habilidadesFiltradas
    .slice(0, 2)
    .map(([codigo, descricao]) => ({
      codigo,
      descricao
    }));
}

/**
 * Executa estratégia multi-query para melhorar precisão do RAG
 * 
 * Problema: Uma única query pode não capturar todos os aspectos relevantes da BNCC
 * Solução: Executar 3 queries complementares e agregar os melhores resultados
 * 
 * Estratégia das queries:
 * 1. Foco em habilidades específicas do tema
 * 2. Busca por objetos de conhecimento relacionados
 * 3. Consulta a competências gerais da etapa de ensino
 * 
 * Benefícios:
 * - Maior cobertura do conteúdo da BNCC
 * - Reduz viés de uma única formulação de busca
 * - Melhora recall mantendo precision
 * 
 * @param tema - Tema educacional (ex: "Números")
 * @param disciplina - Disciplina (ex: "MATEMÁTICA")
 * @param serie - Série específica (ex: "3º ANO")
 * @param anoSerie - Etapa de ensino ("Ensino fundamental" ou "Ensino médio")
 * @param engine - Query engine configurado
 * @returns Objeto com respostas agregadas, nós únicos e habilidades extraídas
 */
async function consultarBNCCMultiplasQueries(
  tema: string,
  disciplina: string,
  serie: string,
  anoSerie: string,
  engine: any
) {
  const nivelEscolar = detectarNivelEscolar(serie);
  
  // Estratégia multi-query: 3 abordagens complementares
  // NOVO: Queries agora incluem explicitamente o nível escolar
  const queries = [
    // Query 1: Foco direto em habilidades com nível escolar
    `${anoSerie} ${serie} ${disciplina} ${tema} habilidades`,
    
    // Query 2: Busca por objetos de conhecimento (estrutura da BNCC)
    `${anoSerie} ${disciplina} ${serie} ${tema} objetos conhecimento`,
    
    // Query 3: Consulta competências gerais da etapa
    `${anoSerie} ${disciplina} competências ${tema} ${serie}`,
  ];

  console.log("   Executando múltiplas queries para melhor precisão...");
  
  const results = [];
  for (let i = 0; i < queries.length; i++) {
    console.log(`   Query ${i + 1}: "${queries[i]}"`);
    const response = await engine.query({ query: queries[i] });
    results.push({
      query: queries[i],
      response: response.response,
      nodes: response.sourceNodes || []
    });
  }

  // Agregar melhores resultados
  const allNodes = results.flatMap(r => r.nodes);
  
  // NOVO: Aplicar filtro de relevância por nível escolar ANTES de ordenar
  console.log(`   🔍 Aplicando filtro de nível escolar: ${nivelEscolar}`);
  const nodesFiltrados = filtrarNodesPorRelevancia(allNodes, tema, disciplina, serie);
  
  console.log(`   📊 Nós antes do filtro: ${allNodes.length}, depois: ${nodesFiltrados.length}`);
  
  // Pegar top 10 únicos já filtrados e ordenados
  const uniqueNodes = [];
  const seenPages = new Set();
  for (const node of nodesFiltrados) {
    const page = node.node?.metadata?.page_number;
    if (page && !seenPages.has(page) && uniqueNodes.length < 10) {
      seenPages.add(page);
      uniqueNodes.push(node);
    }
  }

  // Combinar respostas (resumida)
  const combinedResponse = results.map(r => r.response).join('\n\n');
  
  // Extrair habilidades dos nós (com filtro de nível)
  const habilidades = extrairHabilidadesBNCC(uniqueNodes, nivelEscolar);

  return {
    response: combinedResponse,
    sourceNodes: uniqueNodes,
    queries: queries,
    habilidades: habilidades  // ← NOVO!
  };
}

/**
 * POST /api/gerar-contexto
 * 
 * Endpoint principal que gera contexto pedagógico estruturado a partir da BNCC
 * 
 * FLUXO DE PROCESSAMENTO:
 * 1. Validação dos parâmetros de entrada (tema, disciplina, série)
 * 2. Consulta RAG: busca semântica multi-query na BNCC
 * 3. Extração automática de códigos de habilidades (EF/EM)
 * 4. Geração de contexto enriquecido com IA (cultura digital integrada)
 * 5. Retorno estruturado em JSON para consumo por outras APIs
 * 
 * @route POST /api/gerar-contexto
 * @param {string} tema - Tema educacional a ser trabalhado (obrigatório)
 * @param {string} disciplina - Disciplina da BNCC (obrigatório)
 * @param {string} serie - Série ou ano escolar (obrigatório)
 * @param {string} [bimestre] - Bimestre do ano letivo (opcional)
 * 
 * @returns {Object} JSON com contexto pedagógico, habilidades, cultura digital e fontes
 * @throws {400} Se parâmetros obrigatórios estiverem ausentes
 * @throws {500} Se houver erro no processamento RAG ou LLM
 */
app.post("/api/gerar-contexto", async (req: Request, res: Response) => {
  try {
    const { tema, disciplina, serie, bimestre } = req.body;

    // Validação de parâmetros obrigatórios
    if (!tema || tema.trim() === "") {
      return res.status(400).json({ error: "Tema é obrigatório" });
    }
    if (!disciplina || disciplina.trim() === "") {
      return res.status(400).json({ error: "Disciplina é obrigatória" });
    }
    if (!serie || serie.trim() === "") {
      return res.status(400).json({ error: "Série é obrigatória" });
    }
      
    console.log(`\n🔍 Gerando contexto para: ${tema}`);
    console.log(`   Disciplina: ${disciplina || 'não especificada'}`);
    console.log(`   Série: ${serie || 'não especificada'}`);
    
    // Detecta o nível escolar
    const nivelEscolar = detectarNivelEscolar(serie);
    console.log(`   📚 Nível Escolar Detectado: ${nivelEscolar === "medio" ? "ENSINO MÉDIO" : "ENSINO FUNDAMENTAL"}`);
    console.log(`   🎯 Buscando apenas habilidades: ${nivelEscolar === "medio" ? "EM" : "EF"}XXXXXX`);

    const engine = await initializeQueryEngine();

    let anoSerie = serie as string;
    if( anoSerie.trim().toUpperCase().includes("SÉRIE") || anoSerie.trim().toUpperCase().includes("SERIE")){
      anoSerie = "Ensino médio"
    }else if( anoSerie.trim().toUpperCase().includes("ANO")){
      anoSerie = "Ensino fundamental"
    }

    // 1. Consulta a BNCC com múltiplas queries para melhor precisão
    const bnccResponse = await consultarBNCCMultiplasQueries(
      tema,
      disciplina,
      serie,
      anoSerie,
      engine
    );

    console.log(`✅ BNCC consultada - ${bnccResponse.sourceNodes?.length || 0} fontes únicas`);
    console.log(`✅ Habilidades encontradas: ${bnccResponse.habilidades?.length || 0}`);
    
    // NOVO: Validação final - garantir que só retornamos habilidades do nível correto
    if (bnccResponse.habilidades && bnccResponse.habilidades.length > 0) {
      const habilidadesValidas = bnccResponse.habilidades.filter((h: any) => 
        validarHabilidadeNivel(h.codigo, nivelEscolar)
      );
      
      if (habilidadesValidas.length !== bnccResponse.habilidades.length) {
        console.log(`   ⚠️  ALERTA: ${bnccResponse.habilidades.length - habilidadesValidas.length} habilidade(s) removida(s) na validação final!`);
        bnccResponse.habilidades = habilidadesValidas;
      }
    }
    
    // Log das habilidades encontradas
    if (bnccResponse.habilidades && bnccResponse.habilidades.length > 0) {
      console.log("   ✅ Códigos de habilidades VALIDADOS:");
      bnccResponse.habilidades.forEach((h: any) => {
        console.log(`   • ${h.codigo}: ${h.descricao.substring(0, 80)}...`);
      });
    } else {
      console.log(`   ⚠️  Nenhuma habilidade do nível correto (${nivelEscolar === "medio" ? "EM" : "EF"}) foi encontrada.`);
    }
    
    // Log dos scores para debug
    if (bnccResponse.sourceNodes && bnccResponse.sourceNodes.length > 0) {
      console.log("\n   Top 5 scores:");
      bnccResponse.sourceNodes.slice(0, 5).forEach((node: any, i: number) => {
        const score = Math.abs(node.score || 0);
        console.log(`   [${i + 1}] Página ${node.node?.metadata?.page_number} - Score: ${score.toFixed(4)}`);
      });
      
      // Aviso se os scores são muito baixos
      const bestScore = Math.abs(bnccResponse.sourceNodes[0]?.score || 0);
      if (bestScore < 0.1) {
        console.log(`   ⚠️  Scores muito baixos (${bestScore.toFixed(4)}). RAG pode não estar encontrando conteúdo relevante.`);
        console.log(`   💡 Dica: Tente termos mais específicos ou verifique se o tema existe na BNCC.`);
      } else if (bestScore >= 0.5) {
        console.log(`   ✅ Scores bons! RAG encontrou conteúdo relevante.`);
      }
    }

    // 2. Gera contexto enriquecido com cultura digital
    const habilidadesTexto = bnccResponse.habilidades
      ?.map(h => `${h.codigo}: ${h.descricao}`)
      .join('\n') || 'Nenhuma habilidade específica encontrada.';
    
    const prompt = `Você é um especialista em educação, BNCC e cultura digital.

TEMA: ${tema}
DISCIPLINA: ${disciplina}
SÉRIE: ${serie}

HABILIDADES DA BNCC ENCONTRADAS:
${habilidadesTexto}

TAREFA: Gere um contexto pedagógico CONCISO para ser usado como entrada de outro prompt.

FORMATO (JSON puro, sem markdown):
{
  "tema": "${tema}",
  "serie": "${serie}",
  "disciplina": "${disciplina}",
  "habilidadesBNCC": [
    {"codigo": "EF03MA01", "descricao": "descrição breve"}
  ],
  "contextoPedagogico": {
    "abordagem": "descrição concisa da abordagem pedagógica (ex: introdução conceitual com exemplos do cotidiano)",
    "nivelCognitivo": "nível esperado (ex: compreensão e aplicação)",
    "estrategias": ["máximo 3 estratégias de ensino"],
    "metodologias": ["máximo 3 metodologias aplicáveis"]
  },
  "culturaDigital": {
    "relacao": "relação com tecnologia em 1 frase",
    "tecnologias": ["máximo 3 ferramentas digitais"],
    "recursos": ["máximo 3 recursos REAIS"],
    "competenciasDigitais": ["máximo 2 competências"]
  },
  "sugestoesConteudo": ["máximo 4 tópicos"]
}

Seja EXTREMAMENTE CONCISO. Retorne APENAS o JSON.`;

    const contextoResponse = await Settings.llm!.complete({ prompt });

    console.log("✅ Contexto gerado com cultura digital");

    // Fontes da BNCC consultadas
    const fontes = bnccResponse.sourceNodes?.map((node: any) => ({
      pagina: node.node?.metadata?.page_number,
      score: node.score?.toFixed(4),
    })) || [];

    res.json({
      contexto: JSON.parse(contextoResponse.text),
      bnccReferencia: bnccResponse.response,
      fontes,
      metadata: {
        tema,
        disciplina: disciplina || null,
        serie: serie || null,
        bimestre: bimestre || null,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error: any) {
    console.error("❌ Erro:", error);
    res.status(500).json({
      error: "Erro ao gerar contexto",
      details: error.message
    });
  }
});

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "RAG - BNCC + Cultura Digital",
    llm: Settings.llm?.constructor.name,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 API RAG rodando em http://localhost:${PORT}`);
  console.log(`\n📡 Endpoint principal:`);
  console.log(`   POST /api/gerar-contexto`);
  console.log(`   GET  /api/health\n`);
  console.log(`📚 Base: BNCC + Cultura Digital\n`);
});
