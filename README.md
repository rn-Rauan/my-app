#  API RAG BNCC - Documentação Completa

##  Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Instalação e Configuração](#instalação-e-configuração)
4. [API Reference](#api-reference)
5. [Exemplos de Uso](#exemplos-de-uso)
6. [Estrutura de Dados](#estrutura-de-dados)
7. [Performance e Limitações](#performance-e-limitações)
8. [Troubleshooting](#troubleshooting)

---

## Visão Geral

A **API RAG BNCC** é um serviço especializado que utiliza **RAG (Retrieval Augmented Generation)** para consultar a Base Nacional Comum Curricular (BNCC) e gerar contextos pedagógicos enriquecidos com integração de cultura digital.

### Propósito
-  Consultar a BNCC de forma inteligente usando busca semântica
-  Extrair habilidades específicas (códigos EF/EM) automaticamente
-  Gerar contextos pedagógicos estruturados
-  Integrar cultura digital às propostas educacionais
-  Fornecer dados estruturados para geração de planos de aula

### O que NÃO faz
-  Não gera planos de aula completos (apenas o contexto BNCC)
-  Não cria atividades ou avaliações

---

##  Arquitetura

### Stack Tecnológico

```
┌─────────────────────────────────────────────────────┐
│                   API Central                       │
│                                                     │
└────────────────────┬────────────────────────────────┘
                     │ HTTP POST
                     ▼
┌─────────────────────────────────────────────────────┐
│               API RAG BNCC (Esta API)                │
│  ┌──────────────────────────────────────────────┐   │
│  │  1. Recebe: tema, disciplina, série          │   │
│  │  2. RAG Multi-Query (3 consultas)            │   │
│  │  3. Extração de Habilidades (Regex)          │   │
│  │  4. Geração de Contexto (GPT-4o-mini)        │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌────────┐   ┌─────────┐   ┌─────────┐
   │ Vector │   │   LLM   │   │  Index  │
   │ Store  │   │ OpenAI  │   │  Store  │
   │ 20MB   │   │ GPT-4o  │   │  3.5MB  │
   └────────┘   └─────────┘   └─────────┘
```

### Componentes Principais

#### 1. **Query Engine** (`initializeQueryEngine`)
- Carrega índice vetorial da BNCC (20MB)
- Configura retriever com `similarityTopK: 20`
- Responsável pela busca semântica

#### 2. **Multi-Query Strategy** (`consultarBNCCMultiplasQueries`)
- Executa 3 queries complementares:
  1. Foco em habilidades específicas
  2. Objetos de conhecimento
  3. Competências gerais
- Agrega resultados eliminando duplicatas
- Retorna top 10 páginas mais relevantes

#### 3. **Extração de Habilidades** (`extrairHabilidadesBNCC`)
- Usa regex para identificar códigos:
  - Ensino Fundamental: `EF03MA01` → `EF\d{2}[A-Z]{2}\d{2}`
  - Ensino Médio: `EM13MAT302` → `EM\d{2}[A-Z]{3}\d{2,3}`
- Extrai descrição automaticamente
- Retorna apenas 2 habilidades mais relevantes

#### 4. **Geração de Contexto** (LLM)
- Usa GPT-4o-mini para gerar JSON estruturado
- Prompt otimizado para concisão
- Integra cultura digital aos temas

---

## Instalação e Configuração

### Pré-requisitos
```bash
Node.js >= 18.x
npm ou pnpm
Chave API da OpenAI
```

### 1. Clone e Instale Dependências
```bash
cd my-app
npm install
```

### 2. Configure Variáveis de Ambiente

Crie/edite `.env`:
```env
# OpenAI API Key (OBRIGATÓRIO)
OPENAI_API_KEY=sk-proj-...

# Modelos
MODEL=gpt-4o-mini                    # LLM para geração de texto
EMBEDDING_MODEL=text-embedding-3-small # Modelo de embeddings

# Servidor
API_PORT=3001                        # Porta da API
```

### 3. Gere o Índice Vetorial (Primeira Vez)

 **IMPORTANTE**: Execute apenas uma vez ou quando atualizar o PDF da BNCC

```bash
npm run generate
```

Isso criará no diretório `storage/`:
- `doc_store.json` (3.5MB) - Documentos segmentados
- `vector_store.json` (20MB) - Embeddings vetoriais
- `index_store.json` (1.6MB) - Metadados

### 4. Inicie a API

```bash
npm run api
```

API rodando em: `http://localhost:3001`

---

## API Reference

### Endpoint Principal

#### `POST /api/gerar-contexto`

Gera contexto pedagógico estruturado baseado na BNCC.

**URL**: `http://localhost:3001/api/gerar-contexto`

**Headers**:
```http
Content-Type: application/json
```

**Body Parameters**:

| Campo        | Tipo      | Obrigatório | Descrição                          | Exemplo                    |
|--------------|-----------|-------------|------------------------------------|----------------------------|
| `tema`       | string    |  Sim      | Tema educacional a ser trabalhado  | `"Números decimais"`       |
| `disciplina` | string    |  Sim      | Disciplina da BNCC                 | `"MATEMÁTICA"`             |
| `serie`      | string    |  Sim      | Série ou ano escolar               | `"5º ANO"` ou `"2ª SÉRIE"` |
| `bimestre`   | string    |  Não      | Bimestre do ano letivo (1º a 4º)   | `"2º BIMESTRE"`            |

**Request Example**:
```json
{
  "tema": "Funções polinomiais de 1º ou 2º graus",
  "disciplina": "MATEMÁTICA E SUAS TECNOLOGIAS",
  "serie": "2ª SÉRIE"
}
```

**Response Success (200 OK)**:
```json
{
  "contexto": {
    "tema": "Funções polinomiais de 1º ou 2º graus",
    "serie": "2ª SÉRIE",
    "disciplina": "MATEMÁTICA E SUAS TECNOLOGIAS",
    "habilidadesBNCC": [
      {
        "codigo": "EM13MAT302",
        "descricao": "Construir modelos utilizando funções polinomiais de 1º ou 2º graus..."
      },
      {
        "codigo": "EM13MAT401",
        "descricao": "Converter representações algébricas de funções polinomiais..."
      }
    ],
    "contextoPedagogico": {
      "abordagem": "Introdução conceitual com construção de modelos matemáticos",
      "nivelCognitivo": "Compreensão e aplicação",
      "estrategias": [
        "Modelagem de situações reais",
        "Interpretação de gráficos",
        "Resolução de problemas contextualizados"
      ],
      "metodologias": [
        "Aprendizagem baseada em problemas",
        "Uso de tecnologias digitais",
        "Discussão em grupo"
      ]
    },
    "culturaDigital": {
      "relacao": "Uso de ferramentas digitais para visualização de gráficos de funções",
      "tecnologias": [
        "GeoGebra",
        "Desmos",
        "Excel/Google Sheets"
      ],
      "recursos": [
        "Khan Academy",
        "Wolfram Alpha",
        "PhET Simulations"
      ],
      "competenciasDigitais": [
        "Uso de software matemático",
        "Análise de dados digitais"
      ]
    },
    "sugestoesConteudo": [
      "Construção de gráficos",
      "Análise de coeficientes",
      "Problemas do cotidiano",
      "Interpretação de resultados"
    ]
  },
  "bnccReferencia": "Texto completo extraído da BNCC com todas as habilidades...",
  "fontes": [
    {
      "pagina": 540,
      "score": "0.7234"
    },
    {
      "pagina": 541,
      "score": "0.6891"
    }
  ],
  "metadata": {
    "tema": "Funções polinomiais de 1º ou 2º graus",
    "disciplina": "MATEMÁTICA E SUAS TECNOLOGIAS",
    "serie": "2ª SÉRIE",
    "bimestre": null,
    "timestamp": "2026-01-18T15:30:45.123Z"
  }
}
```

**Error Responses**:

```json
// 400 Bad Request - Parâmetro ausente
{
  "error": "Tema é obrigatório"
}

// 500 Internal Server Error - Erro no processamento
{
  "error": "Erro ao gerar contexto",
  "details": "Mensagem de erro específica"
}
```

### Health Check

#### `GET /health`

Verifica status da API.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-18T15:30:45.123Z"
}
```

---

##  Exemplos de Uso

### Exemplo 1: Ensino Fundamental - Matemática

**Request**:
```bash
curl -X POST http://localhost:3001/api/gerar-contexto \
  -H "Content-Type: application/json" \
  -d '{
    "tema": "Números decimais",
    "disciplina": "MATEMÁTICA",
    "serie": "5º ANO"
  }'
```

**Response** (simplificado):
```json
{
  "contexto": {
    "habilidadesBNCC": [
      {"codigo": "EF05MA02", "descricao": "Ler, escrever e ordenar números decimais..."}
    ],
    "contextoPedagogico": {
      "abordagem": "Introdução com exemplos do cotidiano (dinheiro, medidas)",
      "estrategias": ["Uso de material concreto", "Jogos matemáticos"]
    }
  }
}
```

### Exemplo 2: Ensino Médio - Ciências da Natureza

**Request**:
```bash
curl -X POST http://localhost:3001/api/gerar-contexto \
  -H "Content-Type: application/json" \
  -d '{
    "tema": "Ondas eletromagnéticas",
    "disciplina": "CIÊNCIAS DA NATUREZA E SUAS TECNOLOGIAS",
    "serie": "3ª SÉRIE"
  }'
```

### Exemplo 3: Integração com Node.js

```javascript
const axios = require('axios');

async function gerarContextoBNCC(tema, disciplina, serie) {
  try {
    const response = await axios.post('http://localhost:3001/api/gerar-contexto', {
      tema,
      disciplina,
      serie
    });
    
    const { contexto, fontes } = response.data;
    
    console.log('Habilidades:', contexto.habilidadesBNCC);
    console.log('Estratégias:', contexto.contextoPedagogico.estrategias);
    console.log('Tecnologias:', contexto.culturaDigital.tecnologias);
    
    return contexto;
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
    throw error;
  }
}

// Uso
gerarContextoBNCC(
  'Frações',
  'MATEMÁTICA',
  '4º ANO'
).then(contexto => {
  console.log('Contexto gerado:', contexto);
});
```

## Estrutura de Dados

### Objeto `contexto`

```typescript
interface Contexto {
  tema: string;                    // Tema solicitado
  serie: string;                   // Série solicitada
  disciplina: string;              // Disciplina solicitada
  
  habilidadesBNCC: Habilidade[];   // Até 2 habilidades
  
  contextoPedagogico: {
    abordagem: string;             // Abordagem pedagógica (concisa)
    nivelCognitivo: string;        // Nível cognitivo esperado
    estrategias: string[];         // Máximo 3 estratégias
    metodologias: string[];        // Máximo 3 metodologias
  };
  
  culturaDigital: {
    relacao: string;               // Relação com tecnologia (1 frase)
    tecnologias: string[];         // Máximo 3 ferramentas
    recursos: string[];            // Máximo 3 recursos REAIS
    competenciasDigitais: string[]; // Máximo 2 competências
  };
  
  sugestoesConteudo: string[];     // Máximo 4 tópicos
}

interface Habilidade {
  codigo: string;     // Ex: "EF05MA02" ou "EM13MAT302"
  descricao: string;  // Descrição da habilidade (até 200 chars)
}
```

### Objeto `fontes`

```typescript
interface Fonte {
  pagina: number;    // Número da página na BNCC
  score: string;     // Score de similaridade (0 a 1)
}
```

### Códigos de Habilidades

#### Ensino Fundamental
Formato: `EF[ano][disciplina][sequencial]`

Exemplos:
- `EF03MA01` - 3º ano, Matemática, habilidade 01
- `EF05CI04` - 5º ano, Ciências, habilidade 04
- `EF67HI08` - 6º/7º anos, História, habilidade 08

#### Ensino Médio
Formato: `EM[etapa][área][sequencial]`

Exemplos:
- `EM13MAT302` - Ensino Médio, Matemática, habilidade 302
- `EM13CNT101` - Ensino Médio, Ciências da Natureza, habilidade 101
- `EM13LGG201` - Ensino Médio, Linguagens, habilidade 201

---

## Performance e Limitações

### Performance

| Métrica                 | Valor           | Observação                      |
|-------------------------|-----------------|---------------------------------|
| Tempo médio de resposta | 3-5 segundos    | Depende da complexidade do tema |
| Queries por tema        | 3 quries        | Estratégia multi-query          |
| Documentos recuperados  | 10 únicos       | Top 10 páginas mais relevantes  |
| Habilidades retornadas  | 2               | As mais relevantes              |
| Limite de requisições   | Sem limite hard | Limitado pela API OpenAI        |

### Custos Estimados (OpenAI)

Por requisição:
- **Embeddings**: ~$0.0001 (já gerados, sem custo recorrente)
- **GPT-4o-mini**: ~$0.001 por contexto gerado
- **Custo médio por request**: ~$0.001 USD

Para 1000 requisições/mês: ~$1 USD

### Limitações

1. **Dependências Externas**:
   -  Requer conexão com API OpenAI
   -  Sem fallback offline

2. **Qualidade dos Resultados**:
   -  Scores < 0.5 indicam baixa relevância
   -  Temas muito específicos podem ter poucos resultados
   -  Habilidades podem não ser encontradas se não estiverem no formato padrão

3. **Escalabilidade**:
   -  Suporta múltiplas requisições simultâneas
   -  Query engine carregado em memória (~100MB RAM)
   -  Rate limits da OpenAI aplicam-se

4. **Cobertura**:
   -  Cobre toda a BNCC (600 páginas)
   -  Não inclui currículos estaduais ou municipais
   -  Não valida se tema existe no currículo

---

## Troubleshooting

### Problema: "Index not found"

**Erro**:
```
Error: Index not found. Please run `pnpm run generate`...
```

**Solução**:
```bash
npm run generate
```
Aguarde a geração dos embeddings (pode levar ~10 minutos).

---

### Problema: Scores muito baixos (< 0.1)

**Sintoma**: API retorna `score: "0.0234"` nas fontes

**Diagnóstico**:
```
  Scores muito baixos. RAG pode não estar encontrando conteúdo relevante.
```

**Soluções**:
1. Verifique se o tema existe na BNCC
2. Use termos mais específicos
3. Tente variações do tema (ex: "operações com frações" em vez de "frações")

---

### Problema: Habilidades não encontradas

**Sintoma**: `habilidadesBNCC: []` vazio

**Causas possíveis**:
1. Páginas recuperadas não contêm códigos de habilidades
2. Formato dos códigos diferente do esperado
3. Tema muito genérico

**Soluções**:
1. Use termos mais específicos (ex: "multiplicação de frações" em vez de "matemática")
2. Especifique série corretamente
3. Verifique logs no console da API

---

### Problema: Resposta JSON inválida

**Erro**:
```
SyntaxError: Unexpected token < in JSON at position 0
```

**Causa**: LLM retornou texto em vez de JSON

**Solução**: Este erro é raro. Se ocorrer:
1. Verifique se o modelo está configurado corretamente
2. Tente a requisição novamente
3. Verifique logs da API para ver resposta do LLM

---

### Problema: Timeout ou resposta lenta

**Sintoma**: Requisição demora >10 segundos

**Diagnóstico**:
```bash
# Verifique logs da API
npm run api
```

**Soluções**:
1. Primeira requisição é mais lenta (carrega índice)
2. Reduza `similarityTopK` em `initializeQueryEngine()` de 20 para 10
3. Verifique latência com OpenAI API

---

## Monitoramento e Logs

### Logs da API

A API fornece logs detalhados no console:

```
🔍 Gerando contexto para: Números decimais
   Disciplina: MATEMÁTICA
   Série: 5º ANO
   Executando múltiplas queries para melhor precisão...
   Query 1: "5º ANO MATEMÁTICA Números decimais habilidades"
   Query 2: "MATEMÁTICA 5º ANO Números decimais objetos conhecimento"
   Query 3: "Ensino fundamental MATEMÁTICA competências Números decimais"
 BNCC consultada - 10 fontes únicas
 Habilidades encontradas: 2
   Códigos de habilidades:
   • EF05MA02: Ler, escrever e ordenar números decimais...
   • EF05MA03: Identificar e representar frações...

   Top 5 scores:
   [1] Página 293 - Score: 0.7234
   [2] Página 294 - Score: 0.6891
   [3] Página 270 - Score: 0.6542
   [4] Página 295 - Score: 0.6234
   [5] Página 272 - Score: 0.5987
    Scores bons! RAG encontrou conteúdo relevante.
 Contexto gerado com cultura digital
```

### Arquivos de Configuração

- **API**: `src/api.ts`
- **Settings**: `src/app/settings.ts`
- **Data**: `src/app/data.ts`
- **Env**: `.env`

### Comandos Úteis

```bash
# Desenvolvimento
npm run api          # Inicia API
npm run dev          # Watch mode (auto-reload)

# Geração de índice
npm run generate     # Gera embeddings da BNCC

# Diagnóstico
node -v             # Verifica versão do Node
npm list llamaindex # Verifica instalação LlamaIndex
```

---

### v1.0.0 (2026-01-18)
-  API REST funcional com endpoint `/api/gerar-contexto`
-  Estratégia multi-query implementada
-  Extração automática de códigos de habilidades (EF/EM)
-  Suporte a Ensino Fundamental e Médio
-  Integração com cultura digital
-  Formato estruturado para consumo por outras APIs
-  Documentação completa


**Desenvolvido usando LlamaIndex + OpenAI**
