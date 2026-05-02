"""
Retrocompatibilidade — redireciona imports antigos para infra.database.
"""
from infra.database import engine, get_session, init_db  # noqa: F401
