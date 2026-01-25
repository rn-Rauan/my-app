# 🏗️ Arquitetura Refatorada - API RAG BNCC

## 📁 Nova Estrutura de Pastas

```
src/
├── api-refatorado.ts          # 🚀 Servidor Express (configuração e rotas)
├── api.ts                      # 📦 Código antigo (backup)
│
├── types/                      # 📋 Tipos e Interfaces TypeScript
│   └── index.ts                #    - Centraliza todas as definições de tipos
│
├── utils/                      # 🔧 Utilitários e Validações
│   ├── validators.ts           #    - Detecta nível escolar
│   │                           #    - Valida códigos de habilidade
│   └── filters.ts              #    - Filtra nós do RAG por relevância
│                               #    - Extrai habilidades da BNCC
│
├── services/                   # 💼 Lógica de Negócio
│   ├── rag.service.ts          #    - Inicializa Query Engine
│   │                           #    - Consultas multi-query à BNCC
│   └── context.service.ts      #    - Gera contexto pedagógico com IA
│
├── controllers/                # 🎮 Controle de Rotas
│   └── context.controller.ts  #    - Lógica do endpoint gerar-contexto
│                               #    - Validações de entrada
│                               #    - Orquestra serviços
│
└── app/                        # ⚙️ Configurações Existentes
    ├── data.ts                 #    - Gerencia índice vetorial
    ├── settings.ts             #    - Configura LLM e embeddings
    └── workflow.ts             #    - Workflow do agente (se usado)
```

---

## 🎯 Separação de Responsabilidades

### 1. **api-refatorado.ts** (60 linhas)
**Responsabilidade:** Configuração do servidor Express

```typescript
✅ Inicialização de middlewares (cors, json)
✅ Definição de rotas
✅ Startup do servidor
❌ Não contém lógica de negócio
```

**Código Limpo:**
```typescript
app.post("/api/gerar-contexto", gerarContextoController);
app.get("/api/health", healthCheckHandler);
```

---

### 2. **types/index.ts**
**Responsabilidade:** Definições de tipos centralizadas

```typescript
✅ Interfaces de Request/Response
✅ Tipos de domínio (Habilidade, RAGNode, etc)
✅ Enums (NivelEscolar)
❌ Não contém implementações
```

**Benefícios:**
- Autocomplete no VS Code
- Type safety
- Documentação implícita

---

### 3. **utils/validators.ts** (~50 linhas)
**Responsabilidade:** Validações simples e rápidas

```typescript
✅ detectarNivelEscolar(serie: string)
   → Retorna "fundamental" ou "medio"

✅ validarHabilidadeNivel(codigo: string, nivel: NivelEscolar)
   → Verifica se código EF/EM é compatível

✅ obterDescricaoNivelEscolar(serie: string)
   → Retorna "Ensino médio" ou "Ensino fundamental"
```

**Características:**
- Funções puras (sem side effects)
- Fácil de testar
- Reutilizáveis

---

### 4. **utils/filters.ts** (~150 linhas)
**Responsabilidade:** Processamento de nós do RAG

```typescript
✅ filtrarNodesPorRelevancia()
   → Sistema de pontuação híbrido
   → Penaliza nível escolar errado
   → Retorna nós ordenados

✅ extrairHabilidadesBNCC()
   → Busca códigos EF/EM com regex
   → Extrai descrições
   → Filtra por nível escolar

✅ removerNodesDuplicados()
   → Remove duplicatas por página
   → Mantém os com melhor score
```

**Por que separar?**
- Lógica complexa isolada
- Fácil de debugar e testar
- Documentação concentrada

---

### 5. **services/rag.service.ts** (~80 linhas)
**Responsabilidade:** Comunicação com o RAG (LlamaIndex)

```typescript
✅ initializeQueryEngine()
   → Carrega índice vetorial
   → Configura retriever
   → Cache do engine

✅ consultarBNCC()
   → Estratégia multi-query (3 queries)
   → Agrega resultados
   → Aplica filtros
   → Retorna habilidades validadas
```

**Abstração:**
```typescript
// Simples de usar:
const resultado = await consultarBNCC(tema, disciplina, serie, anoSerie);
// resultado.habilidades ← já validadas!
```

---

### 6. **services/context.service.ts** (~70 linhas)
**Responsabilidade:** Geração de contexto com IA

```typescript
✅ gerarContextoPedagogico()
   → Monta prompt estruturado
   → Chama GPT-4o-mini
   → Parse do JSON retornado
   → Retorna ContextoPedagogico
```

**Por que separar?**
- Isola dependência do LLM
- Facilita mudança de modelo
- Prompt bem documentado

---

### 7. **controllers/context.controller.ts** (~130 linhas)
**Responsabilidade:** Orquestração do endpoint

```typescript
✅ Validação de parâmetros de entrada
✅ Logs detalhados de debug
✅ Orquestra chamadas aos serviços:
   1. consultarBNCC()
   2. gerarContextoPedagogico()
✅ Validação final de habilidades
✅ Formatação da resposta JSON
✅ Tratamento de erros
```

**Fluxo Claro:**
```typescript
1. Validar entrada
2. Consultar RAG
3. Validar habilidades
4. Gerar contexto IA
5. Formatar resposta
6. Retornar ou tratar erro
```

---

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes (api.ts) | Depois (Refatorado) |
|---------|----------------|---------------------|
| **Linhas no arquivo principal** | 599 linhas | 60 linhas |
| **Funções no arquivo principal** | 8 funções | 0 funções |
| **Complexidade** | Alta | Baixa |
| **Testabilidade** | Difícil | Fácil |
| **Manutenção** | Confusa | Clara |
| **Reutilização** | Impossível | Fácil |
| **Documentação** | Dispersa | Concentrada |

---

## 🔄 Fluxo de Execução (Nova Arquitetura)

```
┌─────────────────────────────────────────────────────┐
│  1. REQUEST: POST /api/gerar-contexto               │
│     Body: { tema, disciplina, serie }               │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  2. api-refatorado.ts                               │
│     → Roteia para gerarContextoController()         │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  3. context.controller.ts                           │
│     ✅ Valida parâmetros                            │
│     ✅ Detecta nível escolar (validators)           │
│     ✅ Loga informações                             │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  4. rag.service.ts                                  │
│     → consultarBNCC()                               │
│     ✅ Executa 3 queries no RAG                     │
│     ✅ Filtra nós (filters.ts)                      │
│     ✅ Extrai habilidades (filters.ts)              │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  5. context.service.ts                              │
│     → gerarContextoPedagogico()                     │
│     ✅ Monta prompt                                 │
│     ✅ Chama GPT-4o-mini                            │
│     ✅ Parse JSON                                   │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  6. context.controller.ts                           │
│     ✅ Valida habilidades (validators)              │
│     ✅ Formata resposta                             │
│     ✅ Retorna JSON                                 │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  7. RESPONSE: JSON estruturado                      │
│     { contexto, bnccReferencia, fontes, metadata }  │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Benefícios da Refatoração

### 1. **Código Mais Limpo**
- Cada arquivo tem < 150 linhas
- Funções com responsabilidade única
- Fácil de navegar

### 2. **Fácil de Entender**
```typescript
// Antes (confuso):
// 8 funções misturadas no mesmo arquivo

// Depois (claro):
import { consultarBNCC } from './services/rag.service';
import { gerarContextoPedagogico } from './services/context.service';
```

### 3. **Manutenção Simplificada**
- Bug no filtro? → Vá para `utils/filters.ts`
- Mudar prompt? → Vá para `services/context.service.ts`
- Adicionar rota? → Vá para `api-refatorado.ts`

### 4. **Testabilidade**
```typescript
// Funções isoladas são fáceis de testar
import { detectarNivelEscolar } from './utils/validators';

test('deve detectar ensino médio', () => {
  expect(detectarNivelEscolar("2ª SÉRIE")).toBe("medio");
});
```

### 5. **Reutilização**
```typescript
// Pode usar em outros lugares facilmente
import { filtrarNodesPorRelevancia } from './utils/filters';
import { consultarBNCC } from './services/rag.service';

// Criar novo endpoint que também usa RAG:
app.post("/api/sugerir-temas", async (req, res) => {
  const resultado = await consultarBNCC(...);
  // ...
});
```

---

## 🚀 Como Usar a Nova Arquitetura

### Opção 1: Substituir Completamente
```bash
# Backup do código antigo
mv src/api.ts src/api.old.ts

# Usar novo código
mv src/api-refatorado.ts src/api.ts
```

### Opção 2: Testar Lado a Lado
```bash
# Manter ambos e mudar package.json
"start": "tsx src/api-refatorado.ts"
```

### Opção 3: Migração Gradual
1. Use novo código em desenvolvimento
2. Teste completamente
3. Substitua em produção

---

## 🧪 Teste Rápido

```bash
# 1. Instalar dependências (se necessário)
npm install

# 2. Rodar servidor
npm run dev

# 3. Testar endpoint
curl -X POST http://localhost:3001/api/gerar-contexto \
  -H "Content-Type: application/json" \
  -d '{
    "tema": "operações básicas",
    "disciplina": "Matemática",
    "serie": "2ª SÉRIE"
  }'
```

**Resultado esperado:**
- ✅ Apenas habilidades EM*
- ✅ Contexto pedagógico estruturado
- ✅ Logs detalhados no console

---

## 📖 Documentação dos Módulos

Cada arquivo tem:
- ✅ Comentário de cabeçalho explicando responsabilidade
- ✅ JSDoc em todas as funções
- ✅ Exemplos de uso nos comentários
- ✅ Tipos TypeScript para autocomplete

---

## 🎓 Para Entender um Arquivo

### 1. Leia o cabeçalho
```typescript
/**
 * Serviço RAG - Retrieval Augmented Generation
 * Gerencia consultas semânticas à BNCC usando LlamaIndex
 */
```

### 2. Veja as funções exportadas
```typescript
export async function consultarBNCC(...) { }
```

### 3. Leia o JSDoc
```typescript
/**
 * Consulta a BNCC usando múltiplas queries para maior precisão
 * 
 * Estratégia multi-query:
 * 1. Habilidades específicas do tema
 * ...
 */
```

---

## 💡 Próximos Passos (Opcional)

1. **Adicionar Testes Unitários**
   ```
   src/tests/
   ├── validators.test.ts
   ├── filters.test.ts
   └── services.test.ts
   ```

2. **Adicionar Middleware de Validação**
   ```typescript
   src/middlewares/
   └── validation.middleware.ts
   ```

3. **Adicionar Cache**
   ```typescript
   src/services/
   └── cache.service.ts
   ```

4. **Adicionar Logs Estruturados**
   ```typescript
   src/utils/
   └── logger.ts
   ```

---

## ✅ Conclusão

A arquitetura foi **completamente reorganizada** para ser:

- 🧩 **Modular**: Cada parte tem uma responsabilidade
- 📖 **Legível**: Código simples e bem documentado
- 🔧 **Manutenível**: Fácil de modificar e debugar
- 🧪 **Testável**: Funções isoladas e puras
- 🚀 **Escalável**: Fácil adicionar novos recursos

**Resultado:** De 599 linhas em 1 arquivo → 6 arquivos organizados com ~60-150 linhas cada! 🎉
