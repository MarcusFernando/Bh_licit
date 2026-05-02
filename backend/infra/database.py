"""
Database — Engine, session factory, e inicialização.
"""
from sqlmodel import SQLModel, create_engine
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from infra.config import settings

engine = AsyncEngine(create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # SQL logging só em debug
    future=True,
    pool_size=10,         # Pool de conexões para múltiplos requests
    max_overflow=20,
    pool_pre_ping=True,   # Verifica se conexão está viva antes de usar
))

async_session_factory = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_session() -> AsyncSession:
    """Dependency injection para rotas FastAPI."""
    async with async_session_factory() as session:
        yield session


async def init_db():
    """Cria todas as tabelas. Em produção, usar Alembic."""
    # Import necessário para que SQLModel conheça todos os modelos
    import domain.models  # noqa: F401
    
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
