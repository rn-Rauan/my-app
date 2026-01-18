import express, { Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import { initSettings } from "./app/settings";
import { getIndex } from "./app/data";
import { Settings } from "llamaindex";

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

initSettings();
console.log("✅ Settings inicializado");

let queryEngine: any = null;

async function initializeQueryEngine() {
  if (!queryEngine) {
    const index = await getIndex();
    queryEngine = index.asQueryEngine({
      similarityTopK: 5,
    });
    console.log("✅ Query Engine inicializado");
  }
  return queryEngine;
}

/**
 * Endpoint principal: Gera contexto BNCC + Cultura Digital para um tema
 */
app.post("/api/gerar-contexto", async (req: Request, res: Response) => {
  try {
    const { tema, disciplina, serie, bimestre } = req.body;

    if (!tema) {
      return res.status(400).json({ error: "Tema é obrigatório" });
    }

    console.log(`\n🔍 Gerando contexto para: ${tema}`);
    console.log(`   Disciplina: ${disciplina || 'não especificada'}`);
    console.log(`   Série: ${serie || 'não especificada'}`);

    const engine = await initializeQueryEngine();

    // 1. Consulta a BNCC sobre o tema
    const bnccQuery = `
      Quais são as competências, habilidades e conteúdos da BNCC 
      ${disciplina ? `para ${disciplina}` : ''} 
      ${serie ? `no ${serie}` : ''} 
      ${bimestre ? `no ${bimestre}` : ''}
      relacionados ao tema: ${tema}
    `.trim();

    const bnccResponse = await engine.query({ query: bnccQuery });

    console.log(`✅ BNCC consultada - ${bnccResponse.sourceNodes?.length || 0} fontes`);

    // 2. Gera contexto enriquecido com cultura digital
    const prompt = `Você é um especialista em educação e cultura digital.

TEMA: ${tema}
${disciplina ? `DISCIPLINA: ${disciplina}` : ''}
${serie ? `SÉRIE: ${serie}` : ''}

INFORMAÇÕES DA BNCC:
${bnccResponse.response}

TAREFA:
Gere um contexto pedagógico completo sobre o tema "${tema}" que:

1. **Integre a BNCC**: Cite as competências e habilidades relevantes da BNCC
2. **Relacione com Cultura Digital**: Conecte o tema com:
   - Tecnologias digitais aplicáveis ao tema
   - Recursos digitais (apps, sites, ferramentas)
   - Como a cultura digital impacta/transforma este tema
   - Competências digitais que podem ser desenvolvidas
3. **Contexto Pedagógico**: Forneça informações úteis para criar aulas sobre o tema

FORMATO DA RESPOSTA (JSON):
{
  "tema": "${tema}",
  "competenciasBNCC": ["lista de competências relevantes"],
  "habilidadesBNCC": ["códigos e descrições das habilidades"],
  "contextoPedagogico": "contexto geral sobre o tema para educação",
  "culturaDigital": {
    "relacao": "como o tema se relaciona com cultura digital",
    "tecnologias": ["tecnologias e ferramentas digitais aplicáveis"],
    "recursos": ["apps, sites, plataformas sugeridas"],
    "competenciasDigitais": ["competências digitais desenvolvidas"]
  },
  "sugestoesConteudo": ["tópicos principais a serem abordados"]
}

Retorne APENAS o JSON, sem texto adicional.`;

    const contextoResponse = await Settings.llm!.complete({ prompt });

    console.log("✅ Contexto gerado com cultura digital");

    // Fontes da BNCC consultadas
    const fontes = bnccResponse.sourceNodes?.map((node: any) => ({
      pagina: node.node?.metadata?.page_number,
      score: node.score?.toFixed(4),
    })) || [];

    res.json({
      contexto: contextoResponse.text,
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
