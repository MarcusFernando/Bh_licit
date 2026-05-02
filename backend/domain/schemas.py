"""
Schemas (DTOs) — Request/Response models para validação de entrada.
Separa a validação de dados da entidade do banco.
"""
from typing import Optional, Dict
from pydantic import BaseModel, Field, field_validator
from domain.enums import LicitacaoStatus, ImpugnacaoTipo


# ─── Licitações ──────────────────────────────────────────────────────────────

class StatusUpdate(BaseModel):
    """Validação para PATCH de status — impede strings arbitrárias."""
    status: LicitacaoStatus
    rejection_reason: Optional[str] = None


# ─── Itens ────────────────────────────────────────────────────────────────────

class ItemCreate(BaseModel):
    numero_item: int = Field(ge=1)
    descricao: str = Field(min_length=3, max_length=2000)
    quantidade: float = Field(gt=0)
    valor_unitario: float = Field(ge=0)
    unidade: str = Field(min_length=1, max_length=20)


# ─── Impugnações ─────────────────────────────────────────────────────────────

class ImpugnacaoCreate(BaseModel):
    tipo: ImpugnacaoTipo
    texto: str = Field(min_length=10, max_length=10000)


# ─── Propostas ────────────────────────────────────────────────────────────────

class ProposalRequest(BaseModel):
    prices: Dict[int, float]


# ─── Mensagens ────────────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    sender: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=5000)
    media_url: Optional[str] = None
    requires_approval: Optional[bool] = False


class MessageApproval(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")


# ─── Busca ────────────────────────────────────────────────────────────────────

class SearchParams(BaseModel):
    """Parâmetros de busca validados."""
    q: str = Field(min_length=2, max_length=200)
    limit: int = Field(default=20, ge=1, le=100)
    tipo: Optional[str] = None
    classe: Optional[str] = None

    @field_validator("q")
    @classmethod
    def sanitize_search(cls, v: str) -> str:
        """Remove caracteres perigosos da busca."""
        # Strip SQL/NoSQL injection patterns
        dangerous = [";", "--", "/*", "*/", "xp_", "DROP", "DELETE", "INSERT", "UPDATE", "UNION"]
        clean = v
        for d in dangerous:
            clean = clean.replace(d, "")
        return clean.strip()
