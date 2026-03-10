from typing import Optional, List
from datetime import datetime, timedelta
from sqlmodel import SQLModel, Field, Relationship

# Mapeamento de códigos de modalidade PNCP
MODALIDADE_MAP = {
    1: "Leilão Eletrônico",
    2: "Diálogo Competitivo",
    3: "Concurso",
    4: "Concorrência Eletrônica",
    5: "Concorrência Manual",
    6: "Pregão Eletrônico",
    7: "Pregão Manual",
    8: "Dispensa de Licitação",
    9: "Inexigibilidade",
}

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
    data_encerramento_proposta: Optional[datetime] = None
    link_edital: Optional[str] = None

    # Tipo e Modo de Disputa
    modalidade: Optional[str] = None  # Ex: "Pregão Eletrônico"
    modalidade_codigo: Optional[int] = None  # Código numérico PNCP
    modo_disputa: Optional[str] = None  # "aberto" ou "fechado"
    srp: bool = False  # Sistema de Registro de Preços

    # Prazos automáticos
    data_limite_impugnacao: Optional[datetime] = None
    data_limite_esclarecimento: Optional[datetime] = None

    # Versão do edital
    versao_edital: Optional[int] = None
    edital_atualizado: bool = False  # True se nova versão detectada após ingestion

    # Flags de Filtro
    is_me_epp_exclusive: bool = False
    status: str = Field(default="recebido", index=True)  # recebido, aprovado, rejeitado, analisado
    rejection_reason: Optional[str] = None

    # Categorização (Fase 2)
    categoria: Optional[str] = None  # medicamento, material, equipamento

    # Inteligência (Smart Prioritization)
    priority: str = Field(default="media", index=True)  # alta, media, baixa
    score: int = Field(default=0)

class Licitacao(LicitacaoBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class LicitacaoCreate(LicitacaoBase):
    pass

class LicitacaoRead(LicitacaoBase):
    id: int


# ─── Itens da Licitação ────────────────────────────────────────────────────────

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


# ─── Versões do Edital ────────────────────────────────────────────────────────

class EditalVersionBase(SQLModel):
    licitacao_id: int = Field(foreign_key="licitacao.id", index=True)
    versao: Optional[int] = None
    titulo_arquivo: Optional[str] = None
    url: str
    data_publicacao: datetime
    is_latest: bool = Field(default=False)

class EditalVersion(EditalVersionBase, table=True):
    __tablename__ = "edital_version"
    id: Optional[int] = Field(default=None, primary_key=True)


# ─── Impugnações e Esclarecimentos ───────────────────────────────────────────

class ImpugnacaoBase(SQLModel):
    licitacao_id: int = Field(foreign_key="licitacao.id", index=True)
    tipo: str = Field(default="esclarecimento")  # "impugnacao" | "esclarecimento"
    texto: str
    status: str = Field(default="rascunho")  # rascunho | enviado | respondido
    resposta_texto: Optional[str] = None
    data_resposta: Optional[datetime] = None

class ImpugnacaoEsclarecimento(ImpugnacaoBase, table=True):
    __tablename__ = "impugnacao_esclarecimento"
    id: Optional[int] = Field(default=None, primary_key=True)
    data_criacao: datetime = Field(default_factory=datetime.utcnow)


# ─── Agent Messages ───────────────────────────────────────────────────────────

class AgentMessage(SQLModel, table=True):
    __tablename__ = "agent_messages"
    id: Optional[int] = Field(default=None, primary_key=True)
    sender: str = Field(index=True)
    content: str
    media_url: Optional[str] = None
    requires_approval: bool = Field(default=False)
    approval_status: str = Field(default="pending")  # "pending", "approved", "rejected"
    created_at: Optional[str] = None
