from sqlalchemy import Column, Integer, String, Text, Boolean
from database import Base

class Licitacao(Base):
    __tablename__ = "licitacoes"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, index=True)
    link_edital = Column(String)
    orgao = Column(String)
    descricao = Column(Text)
    
    # Campos da IA
    resumo_ia = Column(Text)
    score_interesse = Column(Integer)
    risco = Column(String) # <--- Essa é a coluna nova que faltava!
    analisado = Column(Boolean, default=False)
    
    # Novos campos V2 (Leitor de Edital)
    data_abertura = Column(String, nullable=True) # Textual por enquanto "22/07/2019"
    valor_estimado = Column(String, nullable=True) # Textual "R$ 500.00"
    created_at = Column(String, nullable=True)