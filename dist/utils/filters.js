/**
 * Filtros e Processadores de Nós do RAG
 * Funções para filtrar e extrair informações dos nós retornados pelo RAG
 */
import { detectarNivelEscolar, validarHabilidadeNivel } from "./validators";
/**
 * Pontuações usadas para classificar a relevância dos nós.
 * - Positivas (boost): Aumentam a relevância.
 * - Negativas (penalidade): Diminuem a relevância.
 */
const PONTUACAO = {
    BOOST_HABILIDADE_NIVEL_CORRETO: 5,
    BOOST_MENCIONOU_NIVEL_CORRETO: 4,
    BOOST_DISCIPLINA: 3,
    BOOST_SERIE: 2,
    PENALIDADE_HABILIDADE_NIVEL_ERRADO: -50,
    PENALIDADE_MENCIONOU_NIVEL_ERRADO: -20,
};
/**
 * Filtra e ordena nós do RAG por relevância.
 *
 * A função atribui uma pontuação para cada nó com base em um sistema híbrido:
 * - Pontos de "boost" são adicionados para características desejáveis.
 * - Pontos de "penalidade" são aplicados para características indesejáveis.
 *
 * Nós com penalidade muito alta são removidos.
 */
export function filtrarNodesPorRelevancia(nodes, tema, disciplina, serie) {
    const nivelEscolar = detectarNivelEscolar(serie);
    // Define quais termos buscar para identificar o nível escolar correto e o incorreto.
    const [palavraNivelCorreto, palavrasNivelErrado] = nivelEscolar === "medio"
        ? ["ensino médio", ["ensino fundamental", "anos iniciais", "anos finais", "fundamental ii"]]
        : ["ensino fundamental", ["ensino médio", "ensino medio"]];
    // Regex para encontrar códigos de habilidade da BNCC (ex: EF01MA01, EM13MAT302).
    const regexHabilidades = /(EF\d{2}[A-Z]{2}\d{2}|EM\d{2}[A-Z]{3}\d{2,3})/gi;
    const enrichedNodes = nodes.map((node) => {
        const texto = node.node?.text?.toLowerCase() || '';
        let boostScore = 0;
        let penaltyScore = 0;
        // 1. Boost por palavras-chave do tema.
        const palavrasChaveTema = tema.toLowerCase().split(' ').filter(p => p.length > 2);
        for (const palavra of palavrasChaveTema) {
            if (texto.includes(palavra)) {
                boostScore += 1;
            }
        }
        // 2. Boost por mencionar a disciplina.
        if (texto.includes(disciplina.toLowerCase())) {
            boostScore += PONTUACAO.BOOST_DISCIPLINA;
        }
        // 3. Boost por mencionar o número da série/ano.
        const anoMatch = serie.match(/(\d+)/); // Extrai o número da string da série (ex: "9º ano" -> "9")
        if (anoMatch && texto.includes(anoMatch[1])) {
            boostScore += PONTUACAO.BOOST_SERIE;
        }
        // 4. Boost ou penalidade baseados nos códigos de habilidade encontrados.
        const codigosEncontrados = texto.match(regexHabilidades) || [];
        for (const codigo of codigosEncontrados) {
            if (validarHabilidadeNivel(codigo.toUpperCase(), nivelEscolar)) {
                boostScore += PONTUACAO.BOOST_HABILIDADE_NIVEL_CORRETO; // Habilidade do nível escolar certo.
            }
            else {
                penaltyScore += PONTUACAO.PENALIDADE_HABILIDADE_NIVEL_ERRADO; // Habilidade do nível errado.
            }
        }
        // 5. Boost ou penalidade por mencionar o nível de ensino.
        if (texto.includes(palavraNivelCorreto)) {
            boostScore += PONTUACAO.BOOST_MENCIONOU_NIVEL_CORRETO;
        }
        for (const palavraErrada of palavrasNivelErrado) {
            if (texto.includes(palavraErrada)) {
                penaltyScore += PONTUACAO.PENALIDADE_MENCIONOU_NIVEL_ERRADO;
            }
        }
        // O score final é uma combinação do score original do RAG, boosts e penalidades.
        const boostedScore = (node.score || 0) * 100 + boostScore + penaltyScore;
        return {
            ...node,
            matchCount: boostScore,
            penalizacaoNivel: penaltyScore,
            boostedScore,
            nivelCorreto: penaltyScore >= 0 || codigosEncontrados.length === 0,
        };
    });
    // Filtra os nós processados.
    const nósFiltrados = enrichedNodes.filter((node) => {
        // Remove nós com penalidade muito alta (provavelmente são do nível errado).
        if (node.penalizacaoNivel < -30) {
            return false;
        }
        // Mantém apenas nós que tiveram algum boost ou que não foram classificados como de nível incorreto.
        return node.matchCount > 0 || node.nivelCorreto;
    });
    // Ordena os nós pelo score final, do maior para o menor.
    return nósFiltrados.sort((a, b) => b.boostedScore - a.boostedScore);
}
/**
 * Extrai códigos de habilidades da BNCC dos nós.
 *
 * A função busca por padrões de código de habilidade (ex: EF01MA01) e suas descrições.
 *
 * @returns Uma lista de até 2 habilidades mais relevantes que pertencem ao nível escolar correto.
 */
export function extrairHabilidadesBNCC(nodes, nivelEscolar) {
    const habilidades = new Map();
    // Regex para encontrar códigos de habilidade da BNCC.
    const regex = /(EF\d{2}[A-Z]{2}\d{2}|EM\d{2}[A-Z]{3}\d{2,3})/g;
    for (const node of nodes) {
        const texto = node.node?.text || '';
        let match;
        // Itera sobre todos os códigos de habilidade encontrados no texto.
        while ((match = regex.exec(texto)) !== null) {
            const codigo = match[0];
            // A descrição da habilidade geralmente vem após o código.
            const inicioDescricao = match.index + codigo.length;
            // A descrição termina no final da linha...
            let fimDescricao = texto.indexOf('\n', inicioDescricao);
            if (fimDescricao === -1) {
                fimDescricao = texto.length;
            }
            // ...ou antes do próximo código de habilidade na mesma linha.
            const textoAteFimLinha = texto.substring(inicioDescricao, fimDescricao);
            const proximoCodigoMatch = textoAteFimLinha.search(regex);
            if (proximoCodigoMatch !== -1) {
                fimDescricao = inicioDescricao + proximoCodigoMatch;
            }
            // Limpa e extrai o texto da descrição.
            let descricao = texto.substring(inicioDescricao, fimDescricao)
                .replace(/^\s*[-–—):\s]+/, '') // Remove caracteres de lista/tópico no início.
                .trim();
            // Limita o tamanho da descrição para ser mais concisa.
            if (descricao.length > 200) {
                descricao = descricao.substring(0, 200) + '...';
            }
            // Adiciona a habilidade ao mapa se a descrição for válida.
            // O mapa ajuda a evitar duplicatas e a manter a descrição mais longa (potencialmente mais completa).
            if (descricao.length > 10) {
                if (!habilidades.has(codigo) || habilidades.get(codigo).length < descricao.length) {
                    habilidades.set(codigo, descricao);
                }
            }
        }
    }
    // Converte o mapa de habilidades para um array.
    const todasHabilidades = Array.from(habilidades.entries());
    // Filtra apenas as habilidades que correspondem ao nível escolar desejado.
    const habilidadesFiltradas = todasHabilidades.filter(([codigo]) => validarHabilidadeNivel(codigo, nivelEscolar));
    // Log para informar sobre habilidades que foram descartadas.
    const habilidadesDescartadas = todasHabilidades.filter(([codigo]) => !validarHabilidadeNivel(codigo, nivelEscolar));
    if (habilidadesDescartadas.length > 0) {
        console.log(`   ⚠️  ${habilidadesDescartadas.length} habilidade(s) descartada(s) por nível incorreto:`);
        habilidadesDescartadas.forEach(([codigo]) => {
            console.log(`      ❌ ${codigo} (esperado: ${nivelEscolar === "medio" ? "EM" : "EF"})`);
        });
    }
    // Retorna as 2 habilidades mais relevantes (as primeiras encontradas nos nós mais relevantes).
    return habilidadesFiltradas
        .slice(0, 2)
        .map(([codigo, descricao]) => ({
        codigo,
        descricao
    }));
}
/**
 * Remove duplicatas de nós baseado no número da página.
 *
 * Se vários nós vierem da mesma página do documento, esta função mantém apenas o primeiro
 * que encontrar (que geralmente é o de maior score, já que os nós estão ordenados).
 *
 * @param nodes Nós enriquecidos e ordenados.
 * @param maxNodes Número máximo de nós únicos a serem retornados.
 * @returns Uma lista de nós únicos.
 */
export function removerNodesDuplicados(nodes, maxNodes = 10) {
    const uniqueNodes = [];
    const seenPages = new Set();
    for (const node of nodes) {
        const page = node.node?.metadata?.page_number;
        // Se a página do nó ainda não foi vista e o limite não foi atingido, adiciona o nó.
        if (page && !seenPages.has(page) && uniqueNodes.length < maxNodes) {
            seenPages.add(page);
            uniqueNodes.push(node);
        }
    }
    return uniqueNodes;
}
