/**
 * Funções de Validação e Utilitários
 * Validações simples para nível escolar e habilidades da BNCC
 */
/**
 * Mapeamento de disciplinas para códigos da BNCC
 *
 * ENSINO MÉDIO (3 letras):
 * - CHS: Ciências Humanas e Sociais Aplicadas (História, Geografia, Filosofia, Sociologia)
 * - LGG: Linguagens e suas Tecnologias (Português, Artes, Educação Física, Inglês)
 * - MAT: Matemática e suas Tecnologias
 * - CNT: Ciências da Natureza e suas Tecnologias (Biologia, Química, Física)
 *
 * ENSINO FUNDAMENTAL (2 letras):
 * - HI: História
 * - GE: Geografia
 * - LP: Língua Portuguesa
 * - AR: Artes
 * - EF: Educação Física
 * - LI: Língua Inglesa
 * - MA: Matemática
 * - CI: Ciências
 */
// Mapeamento para ENSINO MÉDIO (3 letras)
const MAPEAMENTO_MEDIO = {
    // Ciências Humanas e Sociais
    "história": "CHS",
    "historia": "CHS",
    "geografia": "CHS",
    "filosofia": "CHS",
    "sociologia": "CHS",
    "ciências humanas": "CHS",
    "ciencias humanas": "CHS",
    "ciências humanas e sociais": "CHS",
    "ciencias humanas e sociais": "CHS",
    // Linguagens
    "português": "LGG",
    "portugues": "LGG",
    "língua portuguesa": "LGG",
    "lingua portuguesa": "LGG",
    "artes": "LGG",
    "educação física": "LGG",
    "educacao fisica": "LGG",
    "inglês": "LGG",
    "ingles": "LGG",
    "língua inglesa": "LGG",
    "lingua inglesa": "LGG",
    "espanhol": "LGG",
    "linguagens": "LGG",
    "produção textual": "LGG",
    "producao textual": "LGG",
    "redação": "LGG",
    "redacao": "LGG",
    // Matemática
    "matemática": "MAT",
    "matematica": "MAT",
    // Ciências da Natureza
    "biologia": "CNT",
    "química": "CNT",
    "quimica": "CNT",
    "física": "CNT",
    "fisica": "CNT",
    "ciências": "CNT",
    "ciencias": "CNT",
    "ciências da natureza": "CNT",
    "ciencias da natureza": "CNT",
};
// Mapeamento para ENSINO FUNDAMENTAL (2 letras)
const MAPEAMENTO_FUNDAMENTAL = {
    // Ciências Humanas
    "história": "HI",
    "historia": "HI",
    "geografia": "GE",
    // Linguagens
    "português": "LP",
    "portugues": "LP",
    "língua portuguesa": "LP",
    "lingua portuguesa": "LP",
    "artes": "AR",
    "educação física": "EF",
    "educacao fisica": "EF",
    "lingua inglêsa": "LI",
    "lingua inglesa": "LI",
    "língua inglesa": "LI",
    "inglês": "LI",
    "espanhol": "LI",
    // Matemática
    "matemática": "MA",
    "matematica": "MA",
    // Ciências
    "ciências": "CI",
    "ciencias": "CI",
    "ciências naturais": "CI",
    "ciencias naturais": "CI",
};
/**
 * Detecta o código da área/disciplina BNCC baseado na disciplina e nível escolar
 *
 * Para Ensino Médio (3 letras):
 * - detectarAreaBNCC("História", "medio") → "CHS"
 * - detectarAreaBNCC("Ciências", "medio") → "CNT"
 *
 * Para Ensino Fundamental (2 letras):
 * - detectarAreaBNCC("História", "fundamental") → "HI"
 * - detectarAreaBNCC("Ciências", "fundamental") → "CI"
 */
export function detectarAreaBNCC(disciplina, nivelEscolar) {
    const disciplinaLower = disciplina.toLowerCase().trim();
    // Se não foi passado nível, tenta detectar pelo nome da disciplina
    // (disciplinas específicas de médio como Biologia, Química, Física sempre retornam código de médio)
    const disciplinasEspecificasMedio = ["biologia", "química", "quimica", "física", "fisica", "filosofia", "sociologia"];
    if (!nivelEscolar && disciplinasEspecificasMedio.includes(disciplinaLower)) {
        return MAPEAMENTO_MEDIO[disciplinaLower] || null;
    }
    // Se o nível for médio ou não foi especificado (e não é disciplina específica)
    if (nivelEscolar === "medio") {
        return MAPEAMENTO_MEDIO[disciplinaLower] || null;
    }
    // Para ensino fundamental
    return MAPEAMENTO_FUNDAMENTAL[disciplinaLower] || null;
}
/**
 * Extrai o número do ano/série de uma string
 *
 * @example
 * extrairNumeroAno("9º Ano Fundamental") → 9
 * extrairNumeroAno("2ª Série Ensino Médio") → 2
 * extrairNumeroAno("1º ano") → 1
 */
export function extrairNumeroAno(serie) {
    // Busca por padrões como "9º", "9°", "9ª", ou apenas "9"
    const match = serie.match(/(\d+)[ºª°]?\s*(ano|série|serie)/i);
    if (match) {
        return parseInt(match[1], 10);
    }
    // Tenta extrair qualquer número da string
    const numeroMatch = serie.match(/\d+/);
    if (numeroMatch) {
        const num = parseInt(numeroMatch[0], 10);
        // Valida se é um ano escolar válido (1-9 para fundamental, 1-3 para médio)
        if (num >= 1 && num <= 9) {
            return num;
        }
    }
    return null;
}
/**
 * Detecta o nível escolar baseado na série informada
 *
 * Regra simples:
 * - Se contém "SÉRIE" → Ensino Médio
 * - Se contém "ANO" → Ensino Fundamental
 *
 * @example
 * detectarNivelEscolar("2ª SÉRIE") → "medio"
 * detectarNivelEscolar("7º ANO") → "fundamental"
 */
export function detectarNivelEscolar(serie) {
    const serieUpper = serie.toUpperCase();
    if (serieUpper.includes("SÉRIE") || serieUpper.includes("SERIE")) {
        return "medio";
    }
    return "fundamental";
}
/**
 * Valida se o código de habilidade é compatível com o nível escolar
 *
 * Códigos da BNCC:
 * - Ensino Fundamental: EF* (ex: EF07MA01)
 * - Ensino Médio: EM* (ex: EM13MAT302, EM13CHS101)
 *
 * @example
 * validarHabilidadeNivel("EM13MAT302", "medio") → true
 * validarHabilidadeNivel("EF07MA01", "medio") → false
 */
export function validarHabilidadeNivel(codigo, nivelEscolar) {
    if (nivelEscolar === "medio") {
        return codigo.startsWith("EM");
    }
    return codigo.startsWith("EF");
}
/**
 * Extrai o ano da habilidade do código BNCC
 *
 * Para Ensino Fundamental, o ano está nos 2 dígitos após "EF":
 * - EF09GE01 → ano 9
 * - EF06MA01 → ano 6
 * - EF67HI01 → anos 6 e 7 (retorna 6)
 *
 * @example
 * extrairAnoDaHabilidade("EF09GE01") → 9
 * extrairAnoDaHabilidade("EF06MA01") → 6
 * extrairAnoDaHabilidade("EM13CHS101") → null (ensino médio não tem ano específico)
 */
export function extrairAnoDaHabilidade(codigo) {
    // Apenas para Ensino Fundamental
    if (!codigo.startsWith("EF")) {
        return null;
    }
    // Extrai os 2 dígitos após "EF"
    const match = codigo.match(/^EF(\d{2})/);
    if (!match) {
        return null;
    }
    const digitos = match[1];
    const d1 = parseInt(digitos[0], 10);
    const d2 = parseInt(digitos[1], 10);
    // Se começa com 0 (01-09), o ano é o segundo dígito
    if (d1 === 0) {
        return d2;
    }
    // Se for uma sequência (EF67, EF89, EF15), retorna o primeiro ano como referência
    return d1;
}
/**
 * Valida se a habilidade é do ano correto
 *
 * Para Ensino Fundamental, valida se o código é do ano específico ou próximo.
 * Suporta códigos de ano único (EF06) e ciclos (EF15, EF69, EF67).
 *
 * @example
 * validarHabilidadeAno("EF09GE01", 9) → true
 * validarHabilidadeAno("EF06GE01", 9) → false
 * validarHabilidadeAno("EF15LP01", 3) → true (está no ciclo 1-5)
 * validarHabilidadeAno("EF69LP01", 7) → true (está no ciclo 6-9)
 */
export function validarHabilidadeAno(codigo, anoEsperado) {
    // Se não temos ano esperado, aceita qualquer habilidade
    if (anoEsperado === null) {
        return true;
    }
    // Ensino Médio não tem ano específico
    if (codigo.startsWith("EM")) {
        return true;
    }
    const match = codigo.match(/^EF(\d{2})/);
    if (!match) {
        return true; // Se não conseguir parsear, aceita por segurança
    }
    const digitos = match[1];
    const d1 = parseInt(digitos[0], 10);
    const d2 = parseInt(digitos[1], 10);
    // Caso 1: Ano único (01-09)
    if (d1 === 0) {
        // Aceita ano exato ou com tolerância de ±1 ano
        // Ex: EF06 aceita anos 5, 6, 7
        return Math.abs(d2 - anoEsperado) <= 1;
    }
    // Caso 2: Ciclo/Faixa (15, 69, 67, 89)
    // Verifica se o ano esperado está dentro do intervalo [d1, d2]
    // Ex: EF15 (1-5) aceita ano 3
    if (anoEsperado >= d1 && anoEsperado <= d2) {
        return true;
    }
    return false;
}
/**
 * Valida se o código de habilidade pertence à área/disciplina correta
 *
 * Para Ensino Médio (3 letras):
 * - validarHabilidadeArea("EM13CHS101", "CHS") → true
 * - validarHabilidadeArea("EM13LGG301", "CHS") → false
 *
 * Para Ensino Fundamental (2 letras):
 * - validarHabilidadeArea("EF09CI01", "CI") → true (código direto)
 * - validarHabilidadeArea("EF09HI01", "HI") → true (código direto)
 */
export function validarHabilidadeArea(codigo, areaEsperada) {
    if (!areaEsperada) {
        return true; // Se não há área específica, aceita qualquer código
    }
    // Extrai o código da área/disciplina do código de habilidade
    // EM13CHS101 → CHS (3 letras)
    // EF09CI01 → CI (2 letras)
    const match = codigo.match(/^(EF|EM)\d{2}([A-Z]{2,3})\d{2,3}$/);
    if (!match) {
        return false;
    }
    const codigoDisciplina = match[2];
    // Se o código esperado tem 2 letras, é Ensino Fundamental - compara direto
    if (areaEsperada.length === 2) {
        return codigoDisciplina === areaEsperada;
    }
    // Se o código esperado tem 3 letras, é Ensino Médio - compara direto
    if (areaEsperada.length === 3 && codigo.startsWith("EM")) {
        return codigoDisciplina === areaEsperada;
    }
    // Fallback: Mapeia códigos do Fundamental (2 letras) para áreas do Médio (3 letras)
    // Isso permite buscar por área geral quando não temos código específico
    const mapeamentoFundamentalParaArea = {
        "HI": "CHS", // História → Ciências Humanas
        "GE": "CHS", // Geografia → Ciências Humanas
        "LP": "LGG", // Língua Portuguesa → Linguagens
        "AR": "LGG", // Artes → Linguagens
        "EF": "LGG", // Educação Física → Linguagens
        "LI": "LGG", // Língua Inglesa → Linguagens
        "MA": "MAT", // Matemática
        "CI": "CNT", // Ciências → Ciências da Natureza
    };
    const areaGeralFundamental = mapeamentoFundamentalParaArea[codigoDisciplina];
    return areaGeralFundamental === areaEsperada;
}
/**
 * Converte série em texto descritivo do nível escolar
 *
 * @example
 * obterDescricaoNivelEscolar("2ª SÉRIE") → "Ensino médio"
 * obterDescricaoNivelEscolar("7º ANO") → "Ensino fundamental"
 */
export function obterDescricaoNivelEscolar(serie) {
    const nivel = detectarNivelEscolar(serie);
    return nivel === "medio" ? "Ensino médio" : "Ensino fundamental";
}
