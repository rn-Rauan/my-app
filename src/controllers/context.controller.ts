/**
 * Controller de Contexto Pedagógico
 * Gerencia a rota de geração de contexto da BNCC
 */

import { Request, Response } from "express";
import { GerarContextoRequest, GerarContextoResponse } from "../types";
import { consultarBNCC } from "../services/rag.service";
import { gerarContextoPedagogico } from "../services/context.service";
import { detectarNivelEscolar, validarHabilidadeNivel, obterDescricaoNivelEscolar } from "../utils/validators";

/**
 * POST /api/gerar-contexto
 * 
 * Gera contexto pedagógico estruturado a partir da BNCC
 * 
 * Fluxo:
 * 1. Valida parâmetros de entrada
 * 2. Consulta RAG (multi-query na BNCC)
 * 3. Extrai e valida habilidades
 * 4. Gera contexto com IA
 * 5. Retorna JSON estruturado
 */
export async function gerarContextoController(
  req: Request, 
  res: Response
): Promise<void> {
  try {
    const { tema, disciplina, serie, bimestre }: GerarContextoRequest = req.body;

    // === Validação de Parâmetros ===
    if (!tema?.trim()) {
      res.status(400).json({ error: "Tema é obrigatório" });
      return;
    }
    if (!disciplina?.trim()) {
      res.status(400).json({ error: "Disciplina é obrigatória" });
      return;
    }
    if (!serie?.trim()) {
      res.status(400).json({ error: "Série é obrigatória" });
      return;
    }
      
    // === Logs Iniciais ===
    console.log(`\n🔍 Gerando contexto para: ${tema}`);
    console.log(`   Disciplina: ${disciplina}`);
    console.log(`   Série: ${serie}`);
    
    const nivelEscolar = detectarNivelEscolar(serie);
    const anoSerie = obterDescricaoNivelEscolar(serie);
    
    console.log(`   📚 Nível Escolar: ${nivelEscolar === "medio" ? "ENSINO MÉDIO" : "ENSINO FUNDAMENTAL"}`);
    console.log(`   🎯 Buscando habilidades: ${nivelEscolar === "medio" ? "EM*" : "EF*"}`);

    // === 1. Consulta RAG na BNCC ===
    const bnccResponse = await consultarBNCC(tema, disciplina, serie, anoSerie);

    console.log(`✅ BNCC consultada - ${bnccResponse.sourceNodes.length} fontes únicas`);
    console.log(`✅ Habilidades encontradas: ${bnccResponse.habilidades.length}`);
    
    // === 2. Validação Final das Habilidades ===
    const habilidadesValidas = bnccResponse.habilidades.filter(h => 
      validarHabilidadeNivel(h.codigo, nivelEscolar)
    );
    
    if (habilidadesValidas.length !== bnccResponse.habilidades.length) {
      const removidas = bnccResponse.habilidades.length - habilidadesValidas.length;
      console.log(`   ⚠️  ${removidas} habilidade(s) removida(s) na validação final`);
    }
    
    // === 3. Log de Habilidades Validadas ===
    if (habilidadesValidas.length > 0) {
      console.log("   ✅ Códigos de habilidades VALIDADOS:");
      habilidadesValidas.forEach(h => {
        console.log(`   • ${h.codigo}: ${h.descricao.substring(0, 80)}...`);
      });
    } else {
      console.log(`   ⚠️  Nenhuma habilidade ${nivelEscolar === "medio" ? "EM" : "EF"} encontrada`);
    }
    
    // === 4. Log de Scores (Debug) ===
    if (bnccResponse.sourceNodes.length > 0) {
      console.log("\n   Top 5 scores:");
      bnccResponse.sourceNodes.slice(0, 5).forEach((node, i) => {
        const score = Math.abs(node.score || 0);
        console.log(`   [${i + 1}] Página ${node.node?.metadata?.page_number} - Score: ${score.toFixed(4)}`);
      });
      
      const bestScore = Math.abs(bnccResponse.sourceNodes[0]?.score || 0);
      if (bestScore < 0.1) {
        console.log(`   ⚠️  Scores baixos (${bestScore.toFixed(4)}). Conteúdo pode não ser relevante.`);
      } else if (bestScore >= 0.5) {
        console.log(`   ✅ Scores bons! Conteúdo relevante encontrado.`);
      }
    }

    // === 5. Gera Contexto Pedagógico com IA ===
    const contexto = await gerarContextoPedagogico(
      tema, 
      disciplina, 
      serie, 
      habilidadesValidas
    );

    // === 6. Monta Fontes Consultadas ===
    const fontes = bnccResponse.sourceNodes.map(node => ({
      pagina: node.node?.metadata?.page_number,
      score: node.score?.toFixed(4),
    }));

    // === 7. Retorna Resposta ===
    const response: GerarContextoResponse = {
      contexto,
      bnccReferencia: bnccResponse.response,
      fontes,
      metadata: {
        tema,
        disciplina,
        serie,
        bimestre: bimestre || null,
        timestamp: new Date().toISOString(),
      }
    };

    res.json(response);

  } catch (error: any) {
    console.error("❌ Erro:", error);
    res.status(500).json({
      error: "Erro ao gerar contexto",
      details: error.message
    });
  }
}
