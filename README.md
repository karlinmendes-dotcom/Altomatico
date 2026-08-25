# Altomatico - Automação de Conteúdo com IA

## 📁 Estrutura do Projeto

```
/
├── youtube/          # MoneyPrinterTurbo - Geração automática de vídeos YouTube
│   ├── app/          # Código principal (Python/FastAPI)
│   ├── webui/        # Interface gráfica (Streamlit)
│   ├── cli.py        # Interface de linha de comando
│   └── config.example.toml  # Modelo de configuração
│
├── instagram/        # Ai-content_generator-nextjs - Conteúdo IA para Instagram
│   ├── app/          # Código principal (Next.js)
│   ├── components/   # Componentes React
│   └── utils/        # Utilitários e modelos de IA
│
├── convex/           # Backend Convex (banco de dados)
│   ├── schema.ts     # Schema do banco de dados
│   ├── aiOutputs.ts  # Funções para saídas de IA (Instagram)
│   ├── videoTasks.ts # Funções para tarefas de vídeo (YouTube)
│   └── userSettings.ts # Configurações do usuário
│
└── package.json      # Configurações do projeto raiz
```

## 🚀 Tecnologias

- **YouTube**: Python 3.11+, FastAPI, Streamlit, MoviePy, FFmpeg
- **Instagram**: Next.js 14, React, Tailwind CSS, Drizzle ORM
- **Backend**: Convex (banco de dados e funções serverless)
- **Hospedagem**: Vercel (frontend) + Convex (backend)

## 🔧 Configuração

### Variáveis de Ambiente (Convex)
Configure no painel do Freebuff (Settings → Environment):

| Variável | Descrição |
|----------|-----------|
| `APP_NAME` | Nome do aplicativo |
| `CONVEX_DEPLOYMENT_URL` | URL do deployment Convex |
| `YOUTUBE_API_BASE` | URL da API YouTube |
| `INSTAGRAM_API_BASE` | URL da API Instagram |

### Configuração YouTube
Copie `youtube/config.example.toml` para `youtube/config.toml` e configure as chaves de API:

- `moonshot_api_key` - Para geração de roteiro com IA
- `pexels_api_keys` - Para busca de materiais de vídeo
- `elevenlabs_api_key` - Para narração (TTS)

### Configuração Instagram
Configure as variáveis de ambiente em `instagram/.env.local`:

```
NEXT_PUBLIC_DRIZZLE_DB_URL=sua_url_do_banco
NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY=sua_chave_gemini
```

## 📝 Comandos

```bash
# Instalar dependências
bun install

# Desenvolvimento YouTube
cd youtube && uv sync
cd youtube && python main.py

# Desenvolvimento Instagram
cd instagram && bun install
cd instagram && bun run dev

# Convex
bunx convex dev          # Desenvolvimento local
bunx convex deploy       # Deploy para produção
```

## 🔐 Autenticação

- **Convex**: Configure o deploy key via environment variables
- **Vercel**: Configure as variáveis de ambiente no painel do Vercel
- **YouTube API**: Configure as chaves no `config.toml`
- **Instagram API**: Configure no `.env.local` do projeto Instagram
