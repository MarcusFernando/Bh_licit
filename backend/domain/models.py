"""
Domain Models — Entidades SQLModel do banco de dados.
Mantém a mesma estrutura de tabelas, mas com imports organizados.
"""
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


# ─── Licitação ────────────────────────────────────────────────────────────────

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
    modalidade: Optional[str] = None
    modalidade_codigo: Optional[int] = None
    modo_disputa: Optional[str] = None
    srp: bool = False

    # Prazos automáticos
    data_limite_impugnacao: Optional[datetime] = None
    data_limite_esclarecimento: Optional[datetime] = None

    # Versão do edital
    versao_edital: Optional[int] = None
    edital_atualizado: bool = False

    # Flags de Filtro
    me_epp_status: str = Field(default="nao", index=True)
    status: str = Field(default="recebido", index=True)
    rejection_reason: Optional[str] = None

    # Categorização
    categoria: Optional[str] = None

    # Inteligência (Smart Prioritization)
    priority: str = Field(default="media", index=True)
    score: int = Field(default=0)


class Licitacao(LicitacaoBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class LicitacaoCreate(LicitacaoBase):
    pass


class LicitacaoRead(LicitacaoBase):
    id: int


# ─── Itens da Licitação ──────────────────────────────────────────────────────

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
    tipo: str = Field(default="esclarecimento")
    texto: str
    status: str = Field(default="rascunho")
    resposta_texto: Optional[str] = None
    data_resposta: Optional[datetime] = None


class ImpugnacaoEsclarecimento(ImpugnacaoBase, table=True):
    __tablename__ = "impugnacao_esclarecimento"
    id: Optional[int] = Field(default=None, primary_key=True)
    data_criacao: datetime = Field(default_factory=datetime.utcnow)


# ─── Medicamentos CMED (ANVISA) ──────────────────────────────────────────────

class MedicamentoCMED(SQLModel, table=True):
    """Tabela de preços de referência CMED/ANVISA."""
    __tablename__ = "medicamento_cmed"
    id: Optional[int] = Field(default=None, primary_key=True)

    # Identificação
    substancia: str = Field(index=True)
    cnpj: Optional[str] = None
    laboratorio: str = Field(index=True)
    codigo_ggrem: Optional[str] = None
    registro: Optional[str] = None
    ean_1: Optional[str] = None
    ean_2: Optional[str] = None

    # Produto
    produto: str = Field(index=True)
    apresentacao: str
    classe_terapeutica: Optional[str] = None
    tipo_produto: Optional[str] = None
    regime_preco: Optional[str] = None

    # Preços Fábrica
    pf_sem_impostos: Optional[float] = None
    pf_0: Optional[float] = None
    pf_12: Optional[float] = None
    pf_17: Optional[float] = None
    pf_17_alc: Optional[float] = None
    pf_17_5: Optional[float] = None
    pf_18: Optional[float] = None
    pf_19: Optional[float] = None
    pf_20: Optional[float] = None
    pf_21: Optional[float] = None
    pf_22: Optional[float] = None

    # Preços Máximos ao Consumidor
    pmc_0: Optional[float] = None
    pmc_12: Optional[float] = None
    pmc_17: Optional[float] = None
    pmc_17_alc: Optional[float] = None
    pmc_17_5: Optional[float] = None
    pmc_18: Optional[float] = None
    pmc_19: Optional[float] = None
    pmc_20: Optional[float] = None
    pmc_21: Optional[float] = None
    pmc_22: Optional[float] = None

    # Metadados
    restricao_hospitalar: bool = Field(default=False)
    cap: bool = Field(default=False)
    confaz_87: bool = Field(default=False)
    icms_0: bool = Field(default=False)
    analise_recurso: bool = Field(default=False)
    lista_concessao_credito_pis_cofins: Optional[str] = None
    comercializacao_2022: bool = Field(default=False)
    tarja: Optional[str] = None
    data_atualizacao: Optional[datetime] = None


# ─── Agent Messages ───────────────────────────────────────────────────────────

class AgentMessage(SQLModel, table=True):
    __tablename__ = "agent_messages"
    id: Optional[int] = Field(default=None, primary_key=True)
    sender: str = Field(index=True)
    content: str
    media_url: Optional[str] = None
    requires_approval: bool = Field(default=False)
    approval_status: str = Field(default="pending")
    created_at: Optional[str] = None
