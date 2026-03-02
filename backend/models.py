from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field

class LicitacaoBase(SQLModel):
    pncp_id: str = Field(index=True, unique=True)
    numero: Optional[str] = None
    ano: Optional[int] = None
    titulo: str
    orgao_nome: str
    orgao_cnpj: Optional[str] = None
    estado_sigla: str = Field(index=True)
    cidade: Optional[str] = None
    data_publicacao: datetime
    data_abertura_proposta: Optional[datetime] = None
    link_edital: Optional[str] = None
    
    # Flags de Filtro
    is_me_epp_exclusive: bool = False
    status: str = Field(default="recebido", index=True) # recebido, aprovado, rejeitado, analisado
    rejection_reason: Optional[str] = None
    
    # Categorização (Fase 2)
    categoria: Optional[str] = None # medicamento, material, equipamento
    
    # Inteligência (Smart Prioritization)
    priority: str = Field(default="media", index=True) # alta, media, baixa
    score: int = Field(default=0)

class Licitacao(LicitacaoBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class LicitacaoCreate(LicitacaoBase):
    pass

class LicitacaoRead(LicitacaoBase):
    id: int

class LicitacaoItemBase(SQLModel):
    licitacao_id: Optional[int] = Field(default=None, foreign_key="licitacao.id")
    numero_item: int
    descricao: str
    quantidade: float
    unidade: str
    valor_unitario: float
    codigo_item: Optional[str] = None

class LicitacaoItem(LicitacaoItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

