from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Pega a URL de conexão que definimos no docker-compose.yml
# Se não encontrar, usa uma padrão apenas para não quebrar (fallback)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:admin123@db:5432/licitacoes")

# Cria o "motor" de conexão
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Cria a fábrica de sessões (cada requisição ao site vai abrir uma sessão temporária)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para criar as nossas tabelas (Models)
Base = declarative_base()

# Função utilitária para pegar o banco de dados e fechar depois de usar
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()