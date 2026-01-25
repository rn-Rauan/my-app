/**
 * Serviço RAG - Retrieval Augmented Generation
 * Gerencia consultas semânticas à BNCC usando LlamaIndex
 */
import { getIndex } from "../app/data";
import { detectarNivelEscolar } from "../utils/validators";
import { filtrarNodesPorRelevancia, extrairHabilidadesBNCC, removerNodesDuplicados } from "../utils/filters";
// Cache do query engine (inicializado uma vez)
let queryEngine = null;
/**
 * Inicializa o Query Engine do LlamaIndex
 * Carrega o índice vetorial da BNCC e configura o retriever
 */
async function initializeQueryEngine() {
    if (!queryEngine) {
        const index = await getIndex();
        queryEngine = {
            index,
            async query(params) {
                const retriever = index.asRetriever({
                    similarityTopK: 20,
                });
                const nodes = await retriever.retrieve(params.query);
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
export async function consultarBNCC(tema, disciplina, serie, anoSerie) {
    const engine = await initializeQueryEngine();
    const nivelEscolar = detectarNivelEscolar(serie);
    // Gera 3 queries complementares
    const queries = [
        `${anoSerie} ${serie} ${disciplina} ${tema} habilidades`,
        `${anoSerie} ${disciplina} ${serie} ${tema} objetos conhecimento`,
        `${anoSerie} ${disciplina} competências ${tema} ${serie}`,
    ];
    console.log("   Executando múltiplas queries...");
    // Executa queries em sequência
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
    // Agrega todos os nós retornados
    const allNodes = results.flatMap(r => r.nodes);
    // Aplica filtros de relevância por nível escolar
    console.log(`   🔍 Aplicando filtro de nível escolar: ${nivelEscolar}`);
    const nodesFiltrados = filtrarNodesPorRelevancia(allNodes, tema, disciplina, serie);
    console.log(`   📊 Nós: ${allNodes.length} → ${nodesFiltrados.length} (após filtro)`);
    // Remove duplicatas e pega top 10
    const uniqueNodes = removerNodesDuplicados(nodesFiltrados, 10);
    // Combina respostas
    const combinedResponse = results.map(r => r.response).join('\n\n');
    // Extrai habilidades (apenas do nível correto)
    const habilidades = extrairHabilidadesBNCC(uniqueNodes, nivelEscolar);
    return {
        response: combinedResponse,
        sourceNodes: uniqueNodes,
        queries,
        habilidades
    };
}
