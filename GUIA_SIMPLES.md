# 🗺️ Guia Rápido da Nova Arquitetura

## 📚 O que cada arquivo faz (em linguagem simples)

### 🚀 **api-refatorado.ts** - O Porteiro
```
"Sou o porteiro da API"
- Recebo requisições
- Direciono para o lugar certo
- Não faço nada complicado
```

**Quando mexer aqui:**
- ✅ Adicionar nova rota
- ✅ Mudar porta do servidor
- ✅ Adicionar middleware (cors, etc)

---

### 📋 **types/index.ts** - O Dicionário
```
"Sou o dicionário que define como as coisas devem ser"
- Defino formato de habilidades
- Defino formato de requisições
- Defino formato de respostas
```

**Quando mexer aqui:**
- ✅ Adicionar novo campo na resposta
- ✅ Criar novo tipo de dados
- ✅ Definir nova interface

---

### ✅ **utils/validators.ts** - O Fiscal
```
"Verifico se as coisas estão corretas"
- É ensino médio ou fundamental?
- Esse código EF/EM está certo?
```

**Funções simples:**
```typescript
detectarNivelEscolar("2ª SÉRIE") → "medio"
detectarNivelEscolar("7º ANO")   → "fundamental"

validarHabilidadeNivel("EM13MAT302", "medio")      → true ✅
validarHabilidadeNivel("EF07MA01", "medio")        → false ❌
```

**Quando mexer aqui:**
- ✅ Mudar lógica de detecção de nível
- ✅ Adicionar nova validação

---

### 🔍 **utils/filters.ts** - O Filtro de Café
```
"Filtro o que vem do RAG para pegar só o melhor"
- Removo informações do nível errado
- Dou pontos para informações relevantes
- Tiro pontos de informações erradas
```

**Sistema de pontos:**
```
+5  → Código de habilidade correto (EM para médio)
+4  → Menciona "Ensino médio" quando é médio
+3  → Menciona a disciplina
-50 → Código do nível errado (EF quando era médio)
-20 → Menciona nível errado
```

**Quando mexer aqui:**
- ✅ Ajustar sistema de pontuação
- ✅ Mudar lógica de filtro
- ✅ Adicionar novo critério de relevância

---

### 🤖 **services/rag.service.ts** - O Pesquisador
```
"Busco informações na BNCC"
- Faço 3 buscas diferentes (para ter certeza)
- Uso o filtro para pegar só o relevante
- Retorno habilidades validadas
```

**O que faz:**
```
1. Busca "Ensino médio 2ª SÉRIE Matemática operações básicas habilidades"
2. Busca "Ensino médio Matemática 2ª SÉRIE operações básicas objetos conhecimento"
3. Busca "Ensino médio Matemática competências operações básicas 2ª SÉRIE"
4. Junta tudo
5. Filtra pelo nível escolar
6. Retorna top 10 melhores
```

**Quando mexer aqui:**
- ✅ Mudar número de queries
- ✅ Ajustar estratégia de busca
- ✅ Mudar quantos resultados pegar

---

### 🎨 **services/context.service.ts** - O Escritor
```
"Pego as habilidades e crio um texto bonito com a IA"
- Monto um prompt para o GPT
- Peço para gerar contexto pedagógico
- Retorno o JSON formatado
```

**O que gera:**
```json
{
  "tema": "Operações Básicas",
  "habilidadesBNCC": [...],
  "contextoPedagogico": {
    "abordagem": "...",
    "estrategias": [...]
  },
  "culturaDigital": {
    "tecnologias": [...]
  }
}
```

**Quando mexer aqui:**
- ✅ Mudar prompt da IA
- ✅ Adicionar mais informações ao contexto
- ✅ Mudar formato de saída

---

### 🎮 **controllers/context.controller.ts** - O Maestro
```
"Coordeno todo mundo"
1. Valido se mandaram tema, disciplina, série
2. Chamo o Pesquisador (rag.service)
3. Chamo o Escritor (context.service)
4. Valido se está tudo certo
5. Retorno resposta bonita
```

**Fluxo:**
```
Entrada → Validação → RAG → IA → Validação Final → Resposta
```

**Quando mexer aqui:**
- ✅ Adicionar nova validação
- ✅ Adicionar novo passo no fluxo
- ✅ Mudar logs de debug

---

## 🛠️ Como Fazer Mudanças Comuns

### Mudar o Prompt da IA
📁 Vá em: `services/context.service.ts`
📝 Procure por: `const prompt = ...`
✏️ Edite o texto do prompt

### Ajustar Filtro de Nível Escolar
📁 Vá em: `utils/filters.ts`
📝 Procure por: `filtrarNodesPorRelevancia`
✏️ Ajuste os valores de pontuação (+5, -50, etc)

### Adicionar Nova Validação
📁 Vá em: `utils/validators.ts`
✏️ Adicione nova função:
```typescript
export function minhaNovaValidacao(valor: string): boolean {
  // sua lógica aqui
  return true;
}
```

### Adicionar Nova Rota
📁 Vá em: `api-refatorado.ts`
✏️ Adicione:
```typescript
app.post("/api/nova-rota", novoController);
```

📁 Crie: `controllers/novo.controller.ts`
```typescript
export async function novoController(req, res) {
  // sua lógica aqui
}
```

---

## 🐛 Como Debugar Problemas

### Problema: "Retornou habilidade do nível errado"
1. 📂 Veja logs no console
2. 📁 Vá em `utils/filters.ts` → `filtrarNodesPorRelevancia`
3. 🔍 Aumente a penalização (ex: -50 para -100)

### Problema: "Não encontrou nenhuma habilidade"
1. 📂 Veja logs no console (scores muito baixos?)
2. 📁 Vá em `services/rag.service.ts` → `consultarBNCC`
3. 🔍 Ajuste as queries ou aumente `similarityTopK`

### Problema: "Contexto gerado não está bom"
1. 📁 Vá em `services/context.service.ts`
2. 🔍 Ajuste o prompt
3. 💡 Adicione mais exemplos ou instruções

---

## 📦 Ordem de Execução (Visual)

```
┌────────────────────────────────────────┐
│  1. Cliente faz POST /api/gerar-contexto │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│  2. api-refatorado.ts                  │
│     "Ah, é o endpoint de contexto!"    │
│     → Chama context.controller.ts      │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│  3. context.controller.ts              │
│     "Vou validar os dados..."          │
│     → Usa validators.ts                │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│  4. rag.service.ts                     │
│     "Vou buscar na BNCC..."            │
│     → Faz 3 queries                    │
│     → Usa filters.ts para filtrar      │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│  5. context.service.ts                 │
│     "Vou gerar o contexto com IA..."   │
│     → Chama GPT-4o-mini                │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│  6. context.controller.ts              │
│     "Vou validar uma última vez..."    │
│     → Usa validators.ts                │
│     → Retorna JSON                     │
└────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│  7. Api principal recebe o contexto    │
└────────────────────────────────────────┘
```

---

## 🎯 Onde Está Cada Coisa

| O que você quer fazer | Arquivo |
|----------------------|---------|
| Adicionar rota | `api-refatorado.ts` |
| Mudar validação | `utils/validators.ts` |
| Ajustar filtro RAG | `utils/filters.ts` |
| Mudar busca na BNCC | `services/rag.service.ts` |
| Mudar prompt IA | `services/context.service.ts` |
| Mudar fluxo geral | `controllers/context.controller.ts` |
| Adicionar tipo | `types/index.ts` |

---

## 🚀 Testando

```bash
# 1. Rodar servidor
npm run dev

# 2. Testar no terminal
curl -X POST http://localhost:3001/api/gerar-contexto \
  -H "Content-Type: application/json" \
  -d '{
    "tema": "operações básicas",
    "disciplina": "Matemática",
    "serie": "2ª SÉRIE"
  }'

# 3. Ver logs no console do servidor
```

---

