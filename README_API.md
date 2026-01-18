# API RAG - Gerador de Contexto BNCC + Cultura Digital

API simples que consulta a BNCC via RAG e gera contexto pedagógico enriquecido com cultura digital.

## 🎯 O que faz

1. Recebe um **tema** (ex: "Guerra Fria")
2. Consulta a **BNCC** via RAG
3. Gera **contexto** relacionando o tema com **cultura digital**
4. Retorna o contexto para sua outra API usar

## 🚀 Como usar

### 1. Iniciar a API
```bash
npm run api
```

API disponível em: `http://localhost:3001`

---

## 📡 Endpoint

### POST `/api/gerar-contexto`

Gera contexto pedagógico com cultura digital para um tema.

**Request:**
```json
{
  "tema": "Guerra Fria",
  "disciplina": "História",      // opcional
  "serie": "9º ano",             // opcional
  "bimestre": "2º bimestre"      // opcional
}
```

**Response:**
```json
{
  "contexto": "{\"tema\":\"Guerra Fria\",\"competenciasBNCC\":[...],\"culturaDigital\":{...}}",
  "bnccReferencia": "Texto da BNCC sobre o tema...",
  "fontes": [
    { "pagina": 425, "score": "0.8542" },
    { "pagina": 428, "score": "0.8231" }
  ],
  "metadata": {
    "tema": "Guerra Fria",
    "disciplina": "História",
    "serie": "9º ano",
    "timestamp": "2026-01-17T..."
  }
}
```

**Formato do JSON no campo `contexto`:**
```json
{
  "tema": "Guerra Fria",
  "competenciasBNCC": [
    "Competência X da BNCC",
    "Competência Y da BNCC"
  ],
  "habilidadesBNCC": [
    "EF09HI15: Analisar...",
    "EF09HI16: Identificar..."
  ],
  "contextoPedagogico": "A Guerra Fria foi um período de tensão...",
  "culturaDigital": {
    "relacao": "Pode-se explorar simuladores online, documentários digitais...",
    "tecnologias": [
      "Realidade virtual para visitas a museus",
      "Plataformas de streaming com documentários"
    ],
    "recursos": [
      "Google Earth para visualizar muro de Berlim",
      "Timeline interativa online",
      "Jogos educativos sobre Guerra Fria"
    ],
    "competenciasDigitais": [
      "Pesquisa e curadoria de informações",
      "Análise crítica de fontes digitais"
    ]
  },
  "sugestoesConteudo": [
    "Contexto histórico",
    "Principais conflitos",
    "Impactos culturais e tecnológicos"
  ]
}
```

---

## 🧪 Exemplos de Teste

### Usando cURL:
```bash
curl -X POST http://localhost:3001/api/gerar-contexto \
  -H "Content-Type: application/json" \
  -d '{
    "tema": "Guerra Fria",
    "disciplina": "História",
    "serie": "9º ano"
  }'
```

### Usando JavaScript/TypeScript (sua outra API):
```typescript
const response = await fetch('http://localhost:3001/api/gerar-contexto', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tema: 'Guerra Fria',
    disciplina: 'História',
    serie: '9º ano'
  })
});

const data = await response.json();

// Parse o contexto (que vem como string JSON)
const contexto = JSON.parse(data.contexto);

// Agora use o contexto no seu prompt para a outra IA
const prompt = `
Com base no seguinte contexto pedagógico:

${data.bnccReferencia}

Cultura Digital:
${contexto.culturaDigital.relacao}

Recursos sugeridos: ${contexto.culturaDigital.recursos.join(', ')}

Crie um plano de aula completo sobre ${contexto.tema}...
`;

// Enviar para sua IA gerar o plano
```

### Usando Python:
```python
import requests
import json

response = requests.post('http://localhost:3001/api/gerar-contexto', 
    json={
        'tema': 'Guerra Fria',
        'disciplina': 'História',
        'serie': '9º ano'
    }
)

data = response.json()
contexto = json.loads(data['contexto'])

# Usar no seu prompt
prompt = f"""
Com base nas competências da BNCC:
{', '.join(contexto['competenciasBNCC'])}

E considerando a cultura digital:
{contexto['culturaDigital']['relacao']}

Crie um plano de aula sobre {contexto['tema']}...
"""

# Enviar para outra IA
```

---

## 🔧 Configuração

Arquivo `.env`:
```env
OPENAI_API_KEY=sk-proj-...
MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
API_PORT=3001
```

---

## 📊 Fluxo de Integração

```
Sua API Principal
    ↓
    | POST tema: "Guerra Fria"
    ↓
Esta API RAG
    ↓ consulta BNCC
    ↓ gera contexto + cultura digital
    ↓
    | retorna JSON com contexto
    ↓
Sua API Principal
    ↓ usa contexto no prompt
    ↓
Outra IA (gera plano/atividade)
```

---

## 🎯 Casos de Uso

1. **Sua API recebe** pedido para criar plano de aula sobre "Guerra Fria"
2. **Sua API chama** esta API RAG: `POST /api/gerar-contexto` com tema
3. **Esta API retorna** contexto BNCC + cultura digital
4. **Sua API usa** o contexto no prompt para outra IA
5. **Outra IA gera** o plano de aula/atividade final

---

## ✅ Pronto!

Agora você tem uma API dedicada para:
- ✅ Consultar BNCC via RAG
- ✅ Gerar contexto com cultura digital
- ✅ Retornar para sua outra API

Simples e focado! 🚀
