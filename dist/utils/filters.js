/**
 * Filtros e Processadores de Nós do RAG
 * Funções para filtrar e extrair informações dos nós retornados pelo RAG
 */
import { detectarNivelEscolar, validarHabilidadeNivel, validarHabilidadeArea, extrairNumeroAno, validarHabilidadeAno } from "./validators";
/**
 * Pontuações usadas para classificar a relevância dos nós.
 * - Positivas (boost): Aumentam a relevância.
 * - Negativas (penalidade): Diminuem a relevância.
 */
const PONTUACAO = {
    BOOST_HABILIDADE_NIVEL_CORRETO: 5,
    BOOST_HABILIDADE_AREA_CORRETA: 10,
    BOOST_HABILIDADE_ANO_CORRETO: 8, // Novo: boost para ano/série correto
    BOOST_MENCIONOU_NIVEL_CORRETO: 4,
    BOOST_DISCIPLINA: 3,
    BOOST_SERIE: 2,
    BOOST_TEMA_EXATO: 80, // Aumentado para garantir prioridade ao tema exato
    BOOST_TEMA_PARCIAL: 10, // Aumentado para 10
    PENALIDADE_HABILIDADE_NIVEL_ERRADO: -50,
    PENALIDADE_HABILIDADE_AREA_ERRADA: -40,
    PENALIDADE_HABILIDADE_ANO_ERRADO: -35, // Novo: penalidade para ano/série errado
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
export function filtrarNodesPorRelevancia(nodes, tema, disciplina, serie, areaBNCC = null) {
    const nivelEscolar = detectarNivelEscolar(serie);
    const anoEsperado = extrairNumeroAno(serie);
    // Define quais termos buscar para identificar o nível escolar correto e o incorreto.
    const [palavraNivelCorreto, palavrasNivelErrado] = nivelEscolar === "medio"
        ? ["ensino médio", ["ensino fundamental", "anos iniciais", "anos finais", "fundamental ii"]]
        : ["ensino fundamental", ["ensino médio", "ensino medio"]];
    // Regex para encontrar códigos de habilidade da BNCC (ex: EF01MA01, EM13MAT302, EM13CHS101).
    const regexHabilidades = /(EF\d{2}[A-Z]{2}\d{2}|EM\d{2}[A-Z]{3}\d{2,3})/gi;
    const enrichedNodes = nodes.map((node) => {
        const texto = node.node?.text?.toLowerCase() || '';
        const temaLower = tema.toLowerCase().trim();
        let boostScore = 0;
        let penaltyScore = 0;
        // 0. Boost por match exato do tema (frase completa)
        if (texto.includes(temaLower)) {
            boostScore += PONTUACAO.BOOST_TEMA_EXATO;
        }
        // 1. Boost por palavras-chave do tema.
        // Aceita palavras > 2 letras OU palavras de 2 letras se estiverem na lista de exceções relevantes (ex: "to", "be", "fé")
        const palavrasExcecao = ["to", "be", "fé", "up", "on", "in", "at", "by", "of"];
        const palavrasChaveTema = temaLower.split(' ').filter(p => p.length > 2 || palavrasExcecao.includes(p));
        for (const palavra of palavrasChaveTema) {
            if (texto.includes(palavra)) {
                boostScore += PONTUACAO.BOOST_TEMA_PARCIAL;
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
            const codigoUpper = codigo.toUpperCase();
            // Valida nível escolar
            if (validarHabilidadeNivel(codigoUpper, nivelEscolar)) {
                boostScore += PONTUACAO.BOOST_HABILIDADE_NIVEL_CORRETO;
                // Valida ano/série (apenas para Ensino Fundamental)
                if (anoEsperado !== null && nivelEscolar === "fundamental") {
                    if (validarHabilidadeAno(codigoUpper, anoEsperado)) {
                        boostScore += PONTUACAO.BOOST_HABILIDADE_ANO_CORRETO;
                    }
                    else {
                        penaltyScore += PONTUACAO.PENALIDADE_HABILIDADE_ANO_ERRADO;
                    }
                }
                // Valida área da disciplina (CHS, LGG, MAT, CNT)
                if (areaBNCC) {
                    if (validarHabilidadeArea(codigoUpper, areaBNCC)) {
                        boostScore += PONTUACAO.BOOST_HABILIDADE_AREA_CORRETA;
                    }
                    else {
                        penaltyScore += PONTUACAO.PENALIDADE_HABILIDADE_AREA_ERRADA;
                    }
                }
            }
            else {
                penaltyScore += PONTUACAO.PENALIDADE_HABILIDADE_NIVEL_ERRADO;
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
        // Remove nós com penalidade muito alta (provavelmente são do nível ou área errados).
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
 * @returns Uma lista de até 2 habilidades mais relevantes que pertencem ao nível escolar, área e ano corretos.
 */
export function extrairHabilidadesBNCC(nodes, nivelEscolar, areaBNCC = null, anoEsperado = null) {
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
    // Filtra apenas as habilidades que correspondem ao nível escolar, área e ano desejados.
    const habilidadesFiltradas = todasHabilidades.filter(([codigo]) => {
        const nivelValido = validarHabilidadeNivel(codigo, nivelEscolar);
        const areaValida = !areaBNCC || validarHabilidadeArea(codigo, areaBNCC);
        const anoValido = !anoEsperado || validarHabilidadeAno(codigo, anoEsperado);
        return nivelValido && areaValida && anoValido;
    });
    // Log para informar sobre habilidades que foram descartadas.
    const habilidadesDescartadasNivel = todasHabilidades.filter(([codigo]) => !validarHabilidadeNivel(codigo, nivelEscolar));
    const habilidadesDescartadasArea = todasHabilidades.filter(([codigo]) => validarHabilidadeNivel(codigo, nivelEscolar) &&
        areaBNCC &&
        !validarHabilidadeArea(codigo, areaBNCC));
    const habilidadesDescartadasAno = todasHabilidades.filter(([codigo]) => validarHabilidadeNivel(codigo, nivelEscolar) &&
        (!areaBNCC || validarHabilidadeArea(codigo, areaBNCC)) &&
        anoEsperado &&
        !validarHabilidadeAno(codigo, anoEsperado));
    if (habilidadesDescartadasNivel.length > 0) {
        console.log(`   ⚠️  ${habilidadesDescartadasNivel.length} habilidade(s) descartada(s) por nível incorreto:`);
        habilidadesDescartadasNivel.forEach(([codigo]) => {
            console.log(`      ❌ ${codigo} (esperado: ${nivelEscolar === "medio" ? "EM" : "EF"})`);
        });
    }
    if (habilidadesDescartadasArea.length > 0) {
        console.log(`   ⚠️  ${habilidadesDescartadasArea.length} habilidade(s) descartada(s) por área incorreta:`);
        habilidadesDescartadasArea.forEach(([codigo]) => {
            console.log(`      ❌ ${codigo} (esperado: ${areaBNCC})`);
        });
    }
    if (habilidadesDescartadasAno.length > 0) {
        console.log(`   ⚠️  ${habilidadesDescartadasAno.length} habilidade(s) descartada(s) por ano incorreto:`);
        habilidadesDescartadasAno.forEach(([codigo]) => {
            console.log(`      ❌ ${codigo} (esperado: ${anoEsperado}º ano)`);
        });
    }
    // Retorna as 15 habilidades mais relevantes (para garantir que a correta esteja presente)
    return habilidadesFiltradas
        .slice(0, 15)
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
