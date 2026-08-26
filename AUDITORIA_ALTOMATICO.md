# 🔍 AUDITORIA COMPLETA — ALTOMATICO

**Data:** 26/08/2026  
**Auditor:** Codebuff (Buffy)

---

## 📊 RESUMO EXECUTIVO

| Componente | Estado | Nota |
|-----------|--------|------|
| YouTube Engine (Python) | ✅ Completo e funcional | 9/10 |
| Instagram Frontend (Next.js) | ⚠️ Parcial (mocks) | 4/10 |
| Convex Backend | ⚠️ Mínimo | 3/10 |
| Autenticação | ❌ Simulada | 1/10 |
| Orchestrator | ❌ Não existe | 0/10 |
| Scheduler | ❌ Não existe | 0/10 |
| Analytics | ❌ Não existe | 0/10 |
| Segurança | ⚠️ Problemas encontrados | 5/10 |
| Deploy | ✅ Funcionando | 7/10 |

---

## 1. YOUTUBE ENGINE — Análise Detalhada

### Localização: `/youtube`

### O que existe (MUITO BEM IMPLEMENTADO):

#### 🎬 Motor de Vídeo (`video.py` - 59KB)
- MoviePy + FFmpeg para composição
- Suporte a múltiplos aspectos (9:16, 16:9, 1:1)
- Transições entre cenas
- Legendas hardcoded e editáveis
- Zoom, efeitos visuais
- BGM mixing
- Renderização profissional

#### 🗣️ Serviço de Voz (`voice.py` - 91KB)
- **Edge TTS** (gratuito, sem API key)
- **ElevenLabs** (premium)
- **Gemini TTS**
- **MiniMax TTS**
- **Xiaomi MiMo TTS**
- **Fish Audio TTS**
- **Chatterbox TTS**
- Suporte a múltiplos idiomas
- Preview de voz

#### 🧠 Serviço LLM (`llm.py` - 38KB)
- OpenAI, Claude, Gemini, DeepSeek
- Qwen, Grok, MiniMax, Moonshot
- Azure OpenAI
- Ollama (local)
- LiteLLM
- Geração de scripts estruturados
- Extração de keywords para busca de material

#### 🎵 Música de Fundo (`bgm.py` - 13KB)
- Músicas locais em `resource/songs/`
- ElevenLabs Music
- Sonilo API
- Mistura automática com voz

#### 📝 Legendas (`subtitle.py` - 10KB)
- Geração por Edge TTS timestamps
- Whisper (local, GPU)
- Renderização com MoviePy

#### 🎨 Material de Vídeo (`material.py` - 59KB)
- **Pexels** API
- **Pixabay** API
- **Coverr** API
- **WaveSpeed AI** (geração por IA)
- **LoomLoom** (pagamento)
- **TwelveLabs** (análise semântica)
- Cache de materiais
- Download e processamento

#### 📤 Upload Cross-Platform (`upload_post.py`)
- **Upload-Post API** para TikTok, Instagram, YouTube
- Publicação automática
- Configuração por plataforma

#### 🖥️ WebUI (`webui/Main.py` - 6000+ linhas)
- Streamlit
- Configuração visual completa
- Preview de voz
- Gerenciamento de tarefas
- Histórico

#### 🔌 API (`app/controllers/`)
- FastAPI
- Endpoints para geração de vídeo
- Autenticação por API key

#### 📋 Modelos (`models/schema.py`)
- `VideoParams` — parâmetros completos de vídeo
- `MaterialInfo` — informações de material
- Enums para aspectos, modos, transições

### O que JÁ EXISTE e NÃO deve ser recriado:
- ✅ Motor de renderização de vídeo
- ✅ Sistema de TTS multi-provedor
- ✅ Sistema de LLM multi-provedor
- ✅ Download de material de stock
- ✅ Legendas automáticas
- ✅ BGM mixing
- ✅ Upload cross-platform
- ✅ WebUI completa
- ✅ API FastAPI
- ✅ Sistema de tarefas
- ✅ Cache de materiais
- ✅ Configuração TOML

---

## 2. INSTAGRAM FRONTEND — Análise Detalhada

### Localização: `/instagram`

### O que existe:

#### 📱 Páginas Criadas (por mim nesta sessão):
- `/` — Landing page (visual pronto)
- `/dashboard` — Dashboard home (visual pronto)
- `/dashboard/instagram` — Gerador de posts (**MOCK/SIMULAÇÃO**)
- `/dashboard/youtube` — Gerador de vídeos (**MOCK/SIMULAÇÃO**)
- `/sign-in` — Login (visual, sem auth real)
- `/sign-up` — Cadastro (visual, sem auth real)
- `/dashboard/history` — Histórico (usa Convex)
- `/dashboard/settings` — Configurações (visual básico)

#### ⚠️ PROBLEMAS CRÍTICOS ENCONTRADOS:

1. **Mocks disfarçados de funcionalidade:**
   - `instagram/page.tsx` (Instagram) — usa `setTimeout` para simular geração
   - `youtube/page.tsx` (YouTube) — usa `setTimeout` para simular geração
   - Geração de hashtags é fake (baseada em template)
   - Progress bar é animação sem backend real

2. **API Key exposta no frontend:**
   - `AiModel.tsx` usa `process.env.NEXT_PUBLIC_GEMINI_API_KEY`
   - API key do Gemini visível no bundle do cliente
   - **RISCO DE SEGURANÇA CRÍTICO**

3. **Templates genéricos:**
   - `Templates.tsx` contém templates genéricos de blog
   - Não são específicos para Instagram/YouTube
   - Prompts são básicos e em inglês

4. **Dependências desnecessárias:**
   - `moment` e `moments` (duplicadas)
   - `date-fns` (poderia usar uma só)

5. **Código morto:**
   - `Header.tsx` — não está sendo usado
   - `SearchSection.tsx` — não está sendo usado no novo dashboard
   - `TemplateCard.tsx` — pode estar órfão
   - `useSafeQuery.ts` — não está sendo usado

---

## 3. CONVEX BACKEND — Análise Detalhada

### Localização: `/convex`

### Schema Atual:
```typescript
aiOutputs: { formData, aiResponse, templateSlug, createdBy, createdAt }
videoTasks: { theme, status, videoUrl, errorMessage, createdBy, createdAt, completedAt }
userSettings: { userId, youtubeApiKey, instagramApiKey, preferredLlm, createdAt, updatedAt }
```

### ⚠️ PROBLEMAS:
- Schema **mínimo** — não suporta o pipeline completo
- Sem tabela de **conteúdo** (posts, vídeos)
- Sem tabela de **agendamento**
- Sem tabela de **analytics**
- Sem tabela de **calendário**
- Sem tabela de **configurações de plataforma**
- Sem tabela de **logs de publicação**
- Sem tabela de **originality scores**
- Sem tabela de **content DNA**

---

## 4. SEGURANÇA — Auditoria

### 🔴 PROBLEMAS CRÍTICOS:

1. **API Key no frontend:**
   ```typescript
   // AiModel.tsx — VULNERÁVEL
   const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
   ```
   Qualquer pessoa pode ver a chave no bundle JavaScript.

2. **API keys no `.env.local`:**
   - GEMINI_API_KEY (múltiplas)
   - PIXABAY_API_KEY
   - NEXT_PUBLIC_GEMINI_API_KEY (exposta!)
   - NEXT_PUBLIC_CONVEX_URL

3. **YouTube config.toml:**
   - `gemini_api_key` hardcoded
   - `pixabay_api_keys` hardcoded
   - Arquivo no `.gitignore` (correto)

4. **Sem rate limiting no frontend**

5. **Sem validação de entrada em许多 spots**

### ✅ O que está OK:
- `config.toml` está no `.gitignore`
- `.env.local` está no `.gitignore`
- Convex URL é pública (ok para NEXT_PUBLIC_)

---

## 5. ARQUITETURA ATUAL vs ARQUITETURA ALVO

### ATUAL:
```
Instagram (Next.js) → Gemini API (direto do frontend) → Convex (mínimo)
YouTube (Python) → Múltiplas APIs → Upload-Post
SEM CONEXÃO ENTRE OS DOIS
```

### ALVO (conforme missão):
```
ORCHESTRATOR
├── Research Engine
├── Strategy Engine
├── Script Engine
├── Creative Engine
├── Video Engine (existente)
├── Thumbnail Engine
├── SEO Engine
├── Instagram Engine
├── YouTube Engine
├── Policy Engine
├── Originality Engine
├── Scheduler
├── Publishing Engine
└── Analytics Engine
```

---

## 6. CÓDIGO MORTO IDENTIFICADO

| Arquivo | Status | Ação |
|---------|--------|------|
| `instagram/app/dashboard/_components/Header.tsx` | Não usado | Remover ou integrar |
| `instagram/app/dashboard/_components/SearchSection.tsx` | Não usado no novo layout | Manter para referência |
| `instagram/app/dashboard/_components/TemplateCard.tsx` | Possivelmente órfão | Verificar |
| `instagram/utils/useSafeQuery.ts` | Não importado | Remover |
| `instagram/app/(data)/Templates.tsx` | Genérico, não específico | Substituir |
| `instagram/drizzle.config.js` | Deletado | ✅ |
| `instagram/utils/db.tsx` | Deletado | ✅ |
| `instagram/utils/schema.tsx` | Deletado | ✅ |

---

## 7. MOCKS IDENTIFICADOS

| Local | Mock | Substituir por |
|-------|------|----------------|
| `instagram/app/dashboard/instagram/page.tsx` | `setTimeout` fake | Chamada API real |
| `instagram/app/dashboard/youtube/page.tsx` | `setTimeout` fake | Chamada API real |
| `instagram/app/dashboard/instagram/page.tsx` | Hashtags geradas por template | IA real |
| `instagram/app/dashboard/youtube/page.tsx` | Roteiro fake | Gemini API real |
| `instagram/app/dashboard/youtube/page.tsx` | Barra de progresso animação | Progresso real do backend |

---

## 8. INTEGRAÇÕES EXISTENTES (reutilizar)

| Integração | Onde | Status |
|-----------|------|--------|
| Gemini API | `youtube/app/services/llm.py` | ✅ Real |
| Pexels API | `youtube/app/services/material.py` | ✅ Real |
| Pixabay API | `youtube/app/services/material.py` | ✅ Real |
| ElevenLabs | `youtube/app/services/voice.py` | ✅ Real |
| Edge TTS | `youtube/app/services/voice.py` | ✅ Real (grátis) |
| Upload-Post | `youtube/app/services/upload_post.py` | ✅ Real |
| TwelveLabs | `youtube/app/services/twelvelabs.py` | ✅ Real |
| Sonilo BGM | `youtube/app/services/sonilo.py` | ✅ Real |
| ElevenLabs Music | `youtube/app/services/elevenlabs_music.py` | ✅ Real |
| Gemini (frontend) | `instagram/utils/AiModel.tsx` | ⚠️ Inseguro |

---

## 9. PLANO DE IMPLEMENTAÇÃO (Priorizado)

### FASE 1 — Fundação (CRÍTICO)
1. ~~Auditoria~~ ✅
2. Mover chamadas de IA para backend (Convex Actions)
3. Expandir schema Convex para pipeline completo
4. Corrigir segurança (remover API keys do frontend)
5. Criar Content Orchestrator básico

### FASE 2 — Motor de Conteúdo
6. Research Engine (usando Gemini)
7. Script Engine (usando Gemini + prompts estruturados)
8. SEO Engine (títulos, descrições, tags)
9. Hashtag Engine inteligente
10. Content DNA

### FASE 3 — Integração YouTube
11. Conectar frontend ao motor Python existente
12. YouTube OAuth integration
13. YouTube SEO otimizado
14. Thumbnail Engine
15. Agendamento YouTube

### FASE 4 — Integração Instagram
16. Instagram API real (Meta Graph API)
17. Instagram Caption Engine
18. Instagram Reels adaptation
19. Carousel generation
20. Agendamento Instagram

### FASE 5 — Automação
21. Scheduler inteligente
22. Content Calendar
23. Approval Gate
24. Policy Guardian
25. Originality Engine

### FASE 6 — Analytics
26. YouTube Analytics integration
27. Instagram Analytics integration
28. Learning Engine
29. AI Recommendations
30. Dashboard analytics

### FASE 7 — Polish
31. Error handling completo
32. Sistema de logs
33. Performance optimization
34. Documentação
35. Testes

---

## 10. VARIÁVEIS DE AMBIENTE NECESSÁRIAS

### AI/LLM
```
GEMINI_API_KEY          # Principal
GEMINI_API_KEY_2        # Backup
GEMINI_API_KEY_3        # Backup
GEMINI_MODEL            # gemini-3.5-flash
GEMINI_IMAGE_MODEL      # gemini-3.1-flash-image
```

### YouTube
```
YOUTUBE_API_KEY         # Data API v3
YOUTUBE_CLIENT_ID       # OAuth
YOUTUBE_CLIENT_SECRET   # OAuth
```

### Instagram/Meta
```
META_ACCESS_TOKEN       # Graph API
META_APP_ID             # Facebook App
META_APP_SECRET         # Facebook App
INSTAGRAM_BUSINESS_ID   # Business Account
```

### Material
```
PIXABAY_API_KEY         # ✅ Configurada
PEXELS_API_KEY          # Opcional (backup)
```

### Voz
```
ELEVENLABS_API_KEY      # Premium TTS
```

### Database
```
NEXT_PUBLIC_CONVEX_URL  # ✅ Configurada
```

### Storage
```
# Para thumbnails e vídeos
S3_BUCKET               # Opcional
S3_ACCESS_KEY           # Opcional
S3_SECRET_KEY           # Opcional
```

---

## 11. RESUMO PARA O USUÁRIO

### ✅ O que JÁ FUNCIONA (não mexer):
- Motor de vídeo Python completo
- TTS multi-provedor
- Download de material de stock
- Legendas automáticas
- Upload cross-platform
- WebUI Streamlit
- API FastAPI

### ⚠️ O que PRECISA ser CORRIGIDO:
- API key do Gemini exposta no frontend
- Mocks no frontend Instagram
- Schema Convex mínimo
- Sem autenticação real
- Sem orchestrator

### ❌ O que PRECISA ser CRIADO:
- Content Orchestrator
- Research Engine
- Strategy Engine
- SEO Engine
- Thumbnail Engine
- Policy Engine
- Originality Engine
- Scheduler
- Analytics Engine
- Learning Engine
- Content Calendar
- AI Assistant

---

**Fim da Auditoria — Próximo passo: FASE 1**
