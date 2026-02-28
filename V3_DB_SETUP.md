# 🌐 Guia de Conexão V3: "Mente Coletiva"

Este guia descreve como conectar o **Cliente Bryan (Rede 3)** ao **Servidor Marcus (Rede 4)**.

## 1. Pré-requisitos (No PC do Marcus - Servidor)
O PC do Marcus precisa estar rodando o PostgreSQL (via Docker ou local) e aceitando conexões externas.

1.  **PostgreSQL Rodando**:
    - Porta padrão: `5432`
    - Usuário/Senha (Exemplo): `admin` / `admin`
    - Nome do Banco: `licitacao_db`

2.  **Configuração de Rede (Firewall)**:
    - Liberar a porta `5432` no Firewall do Windows para a rede local.
    - Descobrir o IP do Marcus na rede local (ex: `192.168.1.50`).

3.  **Configuração do Postgres (`pg_hba.conf`)**:
    - Permitir conexões do IP do Bryan (ou `0.0.0.0/0` para qualquer IP local).

## 2. Configuração (No PC do Bryan - Cliente)

Você vai alterar o arquivo `backend/.env` para apontar para o PC do Marcus.

### Passo a Passo:

1.  Abra `backend/.env`.
2.  Comente a linha do SQLite:
    ```env
    # DATABASE_URL="sqlite+aiosqlite:///./licitacao.db"
    ```
3.  Adicione a linha do PostgreSQL (substitua `IP_DO_MARCUS`):
    ```env
    # Exemplo: postgresql+asyncpg://usuario:senha@ip:porta/nome_banco
    DATABASE_URL="postgresql+asyncpg://admin:admin@192.168.1.X:5432/licitacao_db"
    ```
4.  Instale o driver do PostgreSQL:
    ```bash
    pip install asyncpg
    ```

## 3. Teste de Conexão
Crie um script `test_v3_connection.py`:
```python
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from core.config import settings

async def test():
    try:
        engine = create_async_engine(settings.DATABASE_URL)
        async with engine.connect() as conn:
            print("✅ SUCESSO! Conectado ao Cérebro Central (Marcus PC).")
    except Exception as e:
        print(f"❌ ERRO: {e}")

if __name__ == "__main__":
    asyncio.run(test())
```
