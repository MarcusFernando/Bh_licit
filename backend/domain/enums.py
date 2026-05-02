"""
Enums do domínio — centraliza valores válidos para status, prioridade, etc.
Substitui strings mágicas por valores tipados e validáveis.
"""
from enum import Enum


class LicitacaoStatus(str, Enum):
    RECEBIDO = "recebido"
    ANALISE = "analise"
    APROVADO = "aprovado"
    EM_PROPOSTA = "em_proposta"
    REJEITADO = "rejeitado"


class Priority(str, Enum):
    ALTA = "alta"
    MEDIA = "media"
    BAIXA = "baixa"


class MeEppStatus(str, Enum):
    NAO = "nao"
    EXCLUSIVO = "exclusivo"
    PARCIAL = "parcial"


class ImpugnacaoTipo(str, Enum):
    IMPUGNACAO = "impugnacao"
    ESCLARECIMENTO = "esclarecimento"


class ImpugnacaoStatus(str, Enum):
    RASCUNHO = "rascunho"
    ENVIADO = "enviado"
    RESPONDIDO = "respondido"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


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
