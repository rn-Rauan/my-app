import { agent } from "@llamaindex/workflow";
import { Settings, FunctionTool, MetadataMode } from "llamaindex";
import { getIndex } from "./data";
import { initSettings } from "./settings";
export const workflowFactory = async (reqBody) => {
    // Garante que Settings está inicializado
    if (!Settings.llm) {
        console.log("Settings.llm não encontrado, inicializando...");
        initSettings();
    }
    console.log("Settings.llm no workflow:", Settings.llm?.constructor.name);
    const index = await getIndex(reqBody?.data);
    const queryEngine = index.asQueryEngine({
        similarityTopK: 3,
    });
    const queryDocumentTool = FunctionTool.from(async ({ query }) => {
        console.log("\n RAG CHAMADO! Query:", query);
        const response = await queryEngine.query({ query });
        console.log(" RAG RETORNOU:", response.response?.substring(0, 150));
        if (response.sourceNodes && response.sourceNodes.length > 0) {
            console.log(`\n ${response.sourceNodes.length} fontes encontradas:\n`);
            response.sourceNodes.forEach((node, idx) => {
                console.log(`  [${idx + 1}] Página ${node.node?.metadata?.page_number} - Score: ${node.score?.toFixed(4)}`);
            });
            // Mostra o conteúdo completo da primeira fonte
            const firstNode = response.sourceNodes[0];
            console.log("\n" + "=".repeat(80));
            console.log(" CONTEÚDO DA PRIMEIRA FONTE (Página " + firstNode.node?.metadata?.page_number + "):");
            console.log("=".repeat(80));
            console.log(firstNode.node?.getContent(MetadataMode.NONE) || "Texto não disponível");
            console.log("=".repeat(80) + "\n");
        }
        return response.response;
    }, {
        name: "query_document",
        description: "Use esta ferramenta OBRIGATORIAMENTE para responder perguntas sobre a Base Nacional Comum Curricular (BNCC). Esta ferramenta tem acesso ao documento completo da BNCC.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "A pergunta sobre a BNCC",
                },
            },
            required: ["query"],
        },
    });
    return agent({
        tools: [queryDocumentTool],
        llm: Settings.llm,
        verbose: true,
    });
};
