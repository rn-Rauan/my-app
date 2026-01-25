/**
 * Funções de Validação e Utilitários
 * Validações simples para nível escolar e habilidades da BNCC
 */
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
 * - Ensino Médio: EM* (ex: EM13MAT302)
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
