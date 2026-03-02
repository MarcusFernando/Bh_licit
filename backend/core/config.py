from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Brasilhosp Licitacao Agent"
    # DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/licitacao_brasilhosp"
    DATABASE_URL: str = "sqlite+aiosqlite:///./licitacao_v2.db"
    
    # PNCP API
    PNCP_BASE_URL: str = "https://pncp.gov.br/api/consulta"
    
    # AI / LLM
    GROQ_API_KEY: str

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
