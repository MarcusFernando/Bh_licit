c# Licitação BrasilHosp - Sistema de Gestão de Propostas (V2)

## 🚀 Sobre o Projeto (Versão Bryan)
Esta é a **Versão 2 (V2)** do sistema de automação para licitações da BrasilHosp.
O objetivo principal é agilizar a criação de propostas comerciais a partir de dados do PNCP, com foco em estabilidade, performance e inteligência artificial para extração de dados.

### ✨ Principais Funcionalidades
- **Gestão de Licitações**: Cadastro manual ou automático via PNCP.
- **Busca Automática de Itens (PNCP)**:
  - Integração direta com API Interna do PNCP (rápida e confiável).
  - Sistema de paginação inteligente (loop automático) para capturar todos os itens, sem depender de limites do servidor.
  - Correção de bugs de API (fetch completo de itens).
- **Importação via PDF**:
  - Upload de editais/termos de referência.
  - Extração inteligente de itens usando LLM (Groq) para estruturar dados não padronizados.
- **Geração de Propostas**:
  - Editor de preços em tempo real.
  - Exportação de proposta formatada em DOCX pronto para envio.
  - Cálculo automático de totais.
- **Dashboard Moderno**:
  - Interface limpa e profissional (Shadcn/UI + Tailwind).
  - Feedback visual de carregamento e status.

---

## 🛠️ Tecnologias Utilizadas

### Backend (Python/FastAPI)
- **FastAPI**: Framework moderno e de alta performance.
- **SQLModel/SQLite**: Banco de dados relacional (fácil migração para PostgreSQL na V3).
- **Playwright**: Automação de navegador para scraping avançado.
- **PyPDF/Groq**: Processamento de arquivos e IA.
- **HTTPX**: Cliente HTTP assíncrono para comunicações com APIs externas.

### Frontend (React/Next.js)
- **Next.js 14**: Framework React para produção.
- **Tailwind CSS**: Estilização utility-first.
- **Shadcn/UI**: Componentes acessíveis e customizáveis.
- **Lucide React**: Ícones modernos.

---

## 📦 Como Rodar o Projeto

### Pré-requisitos
- Python 3.10+
- Node.js 18+

### 1. Iniciar o Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate no Windows
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
*O backend rodará em `http://127.0.0.1:8000`*

### 2. Iniciar o Frontend
```bash
cd frontend
npm install
npm run dev
```
*O frontend rodará em `http://localhost:3000`*

---

## 🔮 Roadmap: Versão V3 (Arquitetura Multi-Agente)
O próximo passo é evoluir para uma arquitetura onde múltiplas Instâncias de IA (Agentes) possam colaborar.

1.  **Banco de Dados Master Centralizado**:
    - Migração de SQLite para PostgreSQL hospedado (Supabase/AWS).
    - Múltiplos agentes conectando ao mesmo `DATABASE_URL` no `.env`.
2.  **Orquestração de Agentes**:
    - **Agente Crawler**: Dedicado apenas a varrer o PNCP 24/7.
    - **Agente Analista**: Lê os editais extraídos e sugere preços.
    - **Agente Comercial**: Gera as propostas e envia emails.
3.  **Comunicação via DB**:
    - Tabelas de `jobs` e `tasks` para coordenar o trabalho entre os agentes.

---

## 📝 Comandos Git para Deploy (V2)
```bash
# Iniciar repositório (se necessário)
git init

# Adicionar remoto
git remote add origin https://github.com/MarcusFernando/Bh_licit.git

# Adicionar arquivos
git add .
git commit -m "feat: versão V2 do Bryan (sem docker)"

# Criar branch isolada
git checkout -b v2-bryan

# Enviar
git push -u origin v2-bryan
```
