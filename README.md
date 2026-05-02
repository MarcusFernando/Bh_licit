# BH-Licit - Plataforma de Inteligência de Licitações (V4)

Esta é a **Versão 4** da plataforma de automação e inteligência de mercado da BrasilHosp. O sistema foi reestruturado com foco em Clean Architecture, preparado para implantação multi-usuário (SaaS interno) e conta com um robusto motor de processamento de preços baseado em IA.

## ✨ Novidades da V4

1. **Arquitetura em Camadas (Clean Architecture)**:
   - Backend modularizado em `app` (Apresentação), `domain` (Entidades e Regras), `services` (Regras de Negócio) e `infra` (Infraestrutura/Banco).
   - Abandono do SQLite em favor de **PostgreSQL** para concorrência multi-usuário.

2. **Inteligência de Mercado (ANVISA/CMED)**:
   - Novo endpoint para upload e processamento da tabela CMED (+27.000 itens).
   - Motor de *Fuzzy Matching* para cruzar automaticamente itens de licitações com os preços-teto da ANVISA.
   - Suporte à API OAuth2 Oficial da ANVISA.

3. **Segurança Reforçada**:
   - `CORS` configurado de forma restrita (fechado para domínios específicos).
   - Uso de `pydantic-settings` para validação robusta de variáveis de ambiente.
   - Remoção de chaves e senhas hardcoded.

4. **Multi-Agentes & Workflow**:
   - Worker em background com `Arq` e `Redis` para raspagem passiva (PNCP).
   - Integração Multi-LLM (Gemini + Groq) para extração inteligente de PDF e análise de editais (exigências de ME/EPP).
   - Chat Neural para interação direta entre operadores comerciais e agentes da plataforma.

---

## 🛠️ Stack Tecnológico

### Backend (Python)
- **FastAPI**: Roteamento e Apresentação
- **SQLModel / SQLAlchemy**: ORM e Gestão de BD
- **Arq + Redis**: Filas e processamento em background
- **TheFuzz**: Algoritmos de Similaridade para Cruzamento de Preços
- **Google Generative AI**: LLM para extração de PDFs

### Infraestrutura (Docker)
- **PostgreSQL 16 (pgvector)**
- **Redis**
- **Docker Compose** para orquestração de 5 containers (`db`, `redis`, `api`, `worker`, `web`)

### Frontend (React/Next.js)
- **Next.js 14**
- **Tailwind CSS + Shadcn/UI**

---

## 📦 Como Rodar o Projeto (Produção / Equipe)

O sistema agora é otimizado para rodar de forma unificada via Docker, sendo ideal para o servidor da empresa.

### 1. Configurar Variáveis de Ambiente
Na pasta `/backend`, crie uma cópia do arquivo de exemplo:
```bash
cp .env.example .env
```
Preencha o `.env` com as senhas, chaves do Gemini/Groq e credenciais ANVISA.

### 2. Iniciar Tudo via Docker
Na raiz do projeto, execute:
```bash
docker compose up -d --build
```

### O que isso sobe?
- `http://localhost:3000` - A interface Web (Next.js)
- `http://localhost:8000` - A API Backend
- `http://localhost:8000/docs` - O Swagger (Documentação Interativa da API)
- Além dos bancos PostgreSQL e Redis internos.

---

## 📂 Estrutura do Backend (Clean Architecture)

```
backend/
├── app/              # Controladores (Rotas FastAPI)
├── domain/           # Entidades, Enums e Schemas (DTOs Pydantic)
├── infra/            # Configurações de Banco (Postgres) e variáveis de ambiente
├── services/         # Casos de Uso (Integrações LLM, ANVISA, PNCP)
├── scripts/          # Ferramentas auxiliares e migrações legadas
├── main.py           # Application Factory Slim (60 linhas)
└── Dockerfile        # Imagem baseada em Python 3.12-slim
```
