"""
Dependencies — Injeção de dependências para os routers.
"""
from infra.database import get_session

# Re-export para uso nos routers
__all__ = ["get_session"]
