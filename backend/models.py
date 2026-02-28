from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from database import Base

from datetime import datetime

class Licitacao(Base):
    __tablename__ = "licitacao"

    id = Column(Integer, primary_key=True, index=True)
    pncp_id = Column(String, unique=True, index=True, nullable=False)
    numero = Column(String)
    ano = Column(Integer)
    titulo = Column(String, nullable=False)
    orgao_nome = Column(String, nullable=False)
    orgao_cnpj = Column(String)
    estado_sigla = Column(String, index=True, nullable=False)
    cidade = Column(String)
    data_publicacao = Column(DateTime, nullable=False, default=datetime.utcnow)
    data_abertura_proposta = Column(DateTime)
    link_edital = Column(String)
    is_me_epp_exclusive = Column(Boolean, nullable=False, default=False)
    status = Column(String, index=True, nullable=False, default='pendente')
    rejection_reason = Column(String)
    categoria = Column(String)
    priority = Column(String, index=True, nullable=False, default='Não Avaliado')
    score = Column(Integer, nullable=False, default=0)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Nossas colunas IA
    resumo_ia = Column(Text)
    risco = Column(String)



class AgentMessage(Base):
    __tablename__ = "agent_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String, index=True)      # e.g. "Agente Comercial - Bryan" ou "Agente Crawler - Marcus"
    content = Column(Text)                   # Texto da mensagem
    media_url = Column(Text, nullable=True)  # Print em base64 ou URL imagem
    requires_approval = Column(Boolean, default=False)
    approval_status = Column(String, default="pending") # "pending", "approved", "rejected"
    created_at = Column(String, nullable=True) # Timestamp
