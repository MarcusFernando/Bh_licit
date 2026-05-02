"""
Configuração centralizada da aplicação.
Usa pydantic-settings para validação e carregamento seguro de env vars.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # ─── App ──────────────────────────────────────────────────────────────────
    PROJECT_NAME: str = "BH-Licit API"
    DEBUG: bool = False
    
    # ─── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://admin:admin123@db:5432/licitacoes"
    
    # ─── Redis ────────────────────────────────────────────────────────────────
    REDIS_HOST: str = "licitacoes_redis"
    REDIS_PORT: int = 6379
    
    # ─── AI / LLM ─────────────────────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    
    # ─── ANVISA ───────────────────────────────────────────────────────────────
    ANVISA_CLIENT_ID: str = ""
    ANVISA_CLIENT_SECRET: str = ""
    
    # ─── CORS ─────────────────────────────────────────────────────────────────
    # Para dev: ["http://localhost:3000"]
    # Para prod: ["https://seudominio.com"]
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # ─── Security ─────────────────────────────────────────────────────────────
    # TODO: Gerar uma chave forte com: python -c "import secrets; print(secrets.token_urlsafe(32))"
    SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
