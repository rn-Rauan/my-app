/**
 * Serviço de Geração de Contexto Pedagógico
 * Gera contexto enriquecido com cultura digital usando LLM
 */
import { Settings } from "llamaindex";
/**
 * Gera contexto pedagógico estruturado usando GPT-4
 *
 * O contexto inclui:
 * - Abordagem pedagógica e nível cognitivo
 * - Estratégias e metodologias de ensino
 * - Integração com cultura digital
 * - Recursos tecnológicos aplicáveis
 * - Sugestões de conteúdo
 */
export async function gerarContextoPedagogico(tema, disciplina, serie, habilidades) {
    // Formata habilidades para o prompt
    const habilidadesTexto = habilidades.length > 0
        ? habilidades.map(h => `${h.codigo}: ${h.descricao}`).join('\n')
        : 'Nenhuma habilidade específica encontrada.';
    // Prompt estruturado para o LLM
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
    // Chama o LLM
    const contextoResponse = await Settings.llm.complete({ prompt });
    console.log("✅ Contexto gerado com cultura digital");
    // Parse e retorna o JSON
    return JSON.parse(contextoResponse.text);
}
