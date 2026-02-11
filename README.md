# 🏛️ BH.LICIT_v2: Plataforma de Inteligência em Licitações

> **Status:** Em Produção (V2) | **Arquitetura:** Microsserviços Dockerizados | **AI Core:** Hybrid RAG (Groq + Gemini)

## 🎯 O Problema
O monitoramento manual de oportunidades de licitação no Portal Nacional de Contratações Públicas (PNCP) e outros diários oficiais é **ineficiente, propenso a erros e custoso**. A filtragem por palavras-chave tradicionais gera muitos falsos positivos, e a análise de editais PDF consome horas de trabalho técnico qualificado.

## 💡 A Solução: BH_LICIT
Uma plataforma automatizada que orquestra a ingestão, análise e apresentação de dados de licitações em tempo real. O sistema utiliza **Agentes de IA** para ler, interpretar e classificar oportunidades com base em critérios semânticos complexos (não apenas palavras-chave), calculando um **Score de Interesse** e **Risco** para cada edital.

---

## 🏗️ Arquitetura de Software

O sistema foi desenhado como uma arquitetura orientada a serviços (SOA), totalmente conteinerizada, facilitando a escalabilidade horizontal e a manutenção.

### Estrutura de Microsserviços (Docker Compose)
1.  **`licitacoes_api` (Backend Core)**: API RESTful em **FastAPI** que gerencia regras de negócio, persistência de dados e orquestração de Agentes AI.
2.  **`licitacoes_worker` (Background Service)**: Serviço assíncrono para tarefas pesadas (Crawling, OCR de PDFs, Processamento de Filas Redis).
3.  **`licitacoes_web` (Frontend)**: Aplicação **Next.js 14** (App Router) construída com **Engenharia de Componentes**, focada em performance e UX "Technical Dashboard".
4.  **`licitacoes_db` (Persistência)**: **PostgreSQL** com extensão `pgvector` (preparado para busca semântica/RAG futuro).
5.  **`licitacoes_redis` (Broker)**: Gerenciamento de filas de tarefas e cache de sessão.

### 🧠 Engenharia de Agentes (Agent Kit 2.0)
Desenvolvido utilizando metodologia de **Engenharia de Contexto**, onde "Skills" e "Rules" foram injetadas no LLM para garantir consistência de código.
- **AI Models:** Estratégia híbrida com **Groq (Llama-3-70b)** para inferência ultra-rápida (JSON Mode) e **Gemini 2.5 Flash** para janela de contexto estendida (análise de Editais PDF longos).
- **RAG (Retrieval-Augmented Generation)**: Pipeline preparada para injeção de contexto jurídico no futuro (V3).

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologias Principais |
| :--- | :--- |
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, Lucide React (Icons) |
| **Backend** | Python 3.9, FastAPI, Pydantic, SQLAlchemy (Async), Arq (Redis Queue) |
| **Database** | PostgreSQL 15, Redis 7-alpine |
| **AI/ML** | Groq SDK, Google Generative AI, PyPDF (Extração) |
| **DevOps** | Docker, Docker Compose, Git (Branching Strategy) |
| **Infra** | Local Host (V2) -> Hybrid Cloud (V3 Planned) |

---

## 📂 Estrutura de Arquivos

```bash
bh-licit/
├── .temp_ag_kit/           # 🧠 Agent Kit: Contexto, Skills e Regras do Agente (Engenharia de Prompt)
├── backend/                # 🐍 Python Microservices
│   ├── services/           # Lógica de Domínio (Ingestion, PDF, AI)
│   ├── ai_agent.py         # Orquestrador de LLMs (Groq/Gemini Fallback)
│   ├── main.py             # Entrypoint da API (Rotas)
│   ├── models.py           # Schemas do Banco de Dados (SQLAlchemy)
│   └── worker.py           # Processamento Assíncrono (Tasks)
├── frontend/               # ⚛️ Next.js Application
│   ├── app/                # App Router
│   │   ├── leitor-edital/  # Módulo: Leitor de PDF Drag-and-Drop
│   │   ├── api.ts          # Camada de Cliente API (Typed)
│   │   └── page.tsx        # Dashboard Operacional (Componentes Complexos)
└── docker-compose.yml      # Infraestrutura como Código (IaC)
```

---

## 🚀 Guia de Uso (Deploy Local)

### Pré-requisitos
- Docker & Docker Compose
- Chaves de API (Groq, Gemini) no arquivo `.env`

### Instalação
1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/bh-licit.git
   cd bh-licit
   ```

2. **Configure as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz baseado no `.env.example`.

3. **Inicie os Containers:**
   ```bash
   docker compose up --build -d
   ```

4. **Acesse:**
   - **Frontend:** http://localhost:3000
   - **API Docs:** http://localhost:8000/docs

---

## 🔮 Roadmap: Rumo à V3 Colaborativa

A próxima fase (V3) focará em colaboração distribuída e integração de novos protocolos de Agentes.

- [ ] **Integração LangChain / MCP (Model Context Protocol):** Padronização da comunicação entre a IA e ferramentas externas (ERP, Email).
- [ ] **Banco de Dados Compartilhado:** Migração para arquitetura Cliente-Servidor em rede local/VPN.
- [ ] **Módulo de Propostas Automáticas:** Geração de documentos `.docx` baseados em templates jurídicos.
- [ ] **Busca Semântica Avançada:** Uso de `pgvector` para encontrar editais por "significado" e não apenas texto.

---

> **Desenvolvido por:** Marcus F & bryan M
> **Powered by:** Agent Kit v2.0
