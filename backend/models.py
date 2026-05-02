"""
Retrocompatibilidade — redireciona imports antigos para a nova camada de domínio.
Os services existentes importam `from models import Licitacao`, este shim garante que funciona.
"""
from domain.models import *  # noqa: F401,F403
from domain.enums import MODALIDADE_MAP  # noqa: F401
