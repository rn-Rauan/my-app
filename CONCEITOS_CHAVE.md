# Conceitos Chave: Embeddings e RAG

Este documento explica de forma simples dois dos conceitos mais importantes por trás da nossa aplicação de IA.

## 1. O que são Embeddings? (A Tradução da Linguagem para a Matemática)

Imagine que você tem um mapa gigante. Em vez de cidades, este mapa posiciona o **significado** de palavras e frases.

**Embedding** é o processo de pegar um pedaço de texto e dar a ele um "endereço" ou uma coordenada (X, Y, Z...) nesse mapa. Esse endereço é, na verdade, uma longa lista de números chamada **vetor**.

**Exemplo:**
- O texto "Habilidades de matemática para o ensino fundamental" é transformado em um vetor como `[0.02, 0.91, -0.45, ...]`.
- Um texto com significado parecido, como "Competências de matemática dos anos iniciais", terá um vetor muito similar, e estará "perto" no mapa.
- Um texto com significado diferente, como "História da arte renascentista", terá um vetor completamente diferente e estará "longe" no mapa.

**Por que isso é importante?**
Computadores não entendem o significado de "matemática", mas são ótimos em comparar listas de números. Usando embeddings, podemos pedir ao computador para "encontrar textos com significado parecido com este", e ele fará isso calculando a distância entre os vetores.

---

## 2. Como Funciona o RAG? (Dando um "Livro Aberto" para a IA)

**RAG** significa **Retrieval-Augmented Generation** (Geração Aumentada por Recuperação). É a técnica que usamos para fazer a IA responder perguntas com base em informações de documentos específicos (como o nosso PDF da BNCC), em vez de apenas usar seu conhecimento genérico.

O processo tem duas fases:

### Fase 1: Indexação (O Preparo - Feito uma vez)

Antes que qualquer pergunta seja feita, o sistema se prepara:

1.  **Leitura e Divisão:** O sistema lê o documento (`BNCC_EI_EF_110518_versaofinal.pdf`) e o quebra em pedaços menores e gerenciáveis. Esses pedaços são os **`nodes`** que vimos no código.
2.  **Criação de Embeddings:** Para cada `node` (pedaço de texto), o sistema cria um **embedding** (o vetor de números que representa seu significado).
3.  **Armazenamento:** O sistema guarda todos os `nodes` e seus respectivos embeddings em um banco de dados especial, chamado **Vector Store**. Pense nisso como um índice superpoderoso para o nosso documento.

### Fase 2: Recuperação e Geração (A Mágica - Acontece a cada pergunta)

Quando você faz uma pergunta (ex: "atividades para o 2º ano de português"):

1.  **Embedding da Pergunta:** O sistema primeiro cria um embedding para a sua pergunta.
2.  **Busca (Retrieval):** Ele vai até o Vector Store e compara o embedding da sua pergunta com os embeddings de todos os `nodes` do documento. Ele então "recupera" os `nodes` mais próximos, ou seja, os trechos do PDF que têm o significado mais parecido com a sua pergunta.
3.  **Aumento (Augmentation):** O sistema agora monta um novo prompt para a IA principal. Ele junta:
    *   A sua pergunta original.
    *   O contexto que ele acabou de encontrar (os textos dos `nodes` mais relevantes).
    *   Uma instrução, como: "Com base no contexto a seguir, responda à pergunta do usuário."
4.  **Geração (Generation):** A IA recebe esse prompt "aumentado" e gera uma resposta precisa, baseada nos fatos contidos no documento.

É por isso que o `filters.ts` é tão importante: ele atua **após a etapa 2 (Busca)**, refinando a lista de `nodes` recuperados para garantir que apenas os melhores e mais relevantes sejam usados para gerar a resposta final.