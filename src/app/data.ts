/**
 * Gerenciamento do índice vetorial da BNCC
 * 
 * Este módulo carrega o índice vetorial previamente gerado do storage.
 * O índice contém os embeddings de todo o documento da BNCC,
 * permitindo busca semântica rápida e eficiente.
 */

import {
  SimpleDocumentStore,
  storageContextFromDefaults,
  VectorStoreIndex,
} from "llamaindex";

/**
 * Carrega o índice vetorial da BNCC do disco
 * 
 * O índice foi previamente gerado pelo script generate.ts e contém:
 * - doc_store.json: Documentos originais segmentados
 * - vector_store.json: Embeddings vetoriais (~20MB)
 * - index_store.json: Metadados do índice
 * 
 * @param params - Parâmetros opcionais de configuração
 * @returns {Promise<VectorStoreIndex>} Índice carregado e pronto para consultas
 * @throws {Error} Se o índice não existir no storage (precisa gerar primeiro)
 */
export async function getIndex(params?: any) {
  // Carrega o contexto de armazenamento do diretório storage/
  const storageContext = await storageContextFromDefaults({
    persistDir: "storage",
  });

  // Verifica se o índice foi gerado
  const numberOfDocs = Object.keys(
    (storageContext.docStore as SimpleDocumentStore).toDict(),
  ).length;
  
  if (numberOfDocs === 0) {
    throw new Error(
      "Index not found. Please run `pnpm run generate` to generate the embeddings of the documents",
    );
  }

  // Inicializa e retorna o índice vetorial
  return await VectorStoreIndex.init({ storageContext });
}
