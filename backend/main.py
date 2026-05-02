"""
BH-Licit API — Application Factory.
Arquivo principal slim: apenas configuração, middleware e registro de routers.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from infra.config import settings
from infra.database import init_db


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ─── CORS ─────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ─── Startup ──────────────────────────────────────────────────────────
    @app.on_event("startup")
    async def on_startup():
        await init_db()

    # ─── Health Check ─────────────────────────────────────────────────────
    @app.get("/", tags=["Health"])
    async def root():
        return {"status": "ok", "service": settings.PROJECT_NAME}

    @app.get("/health", tags=["Health"])
    async def health():
        return {"status": "healthy"}

    # ─── Routers ──────────────────────────────────────────────────────────
    from app.routers import licitacoes, analysis, pipeline, dashboard, anvisa, messages

    app.include_router(licitacoes.router)
    app.include_router(analysis.router)
    app.include_router(pipeline.router)
    app.include_router(dashboard.router)
    app.include_router(anvisa.router)
    app.include_router(messages.router)

    return app


app = create_app()
