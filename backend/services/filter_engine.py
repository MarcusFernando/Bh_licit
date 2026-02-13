from models import LicitacaoCreate

class FilterEngine:
    WHITE_LIST = [
        "medicament", "farmac", "hospital", "enfermagem", "saude", "odontol",
        "laborator", "cirurg", "ortoped", "fisioterap", "penso", "gaze",
        "luva", "seringa", "cateter", "agulha", "algodao", "infusao",
        "sonda", "curativo", "diagnostico", "reagente", "teste rapido",
        "equipamento medico", "material medico"
    ]
    
    BLACK_LIST = [
        "obra", "engenharia", "transporte", "locação", "limpeza", "vigilância", 
        "buffet", "alimentação", "merenda", "carro", "veículo", "automotivo", 
        "peça", "pneu", "manutenção", "ar condicionado", "impressora", 
        "cartucho", "papel", "expediente", "informática", "computador",
        "motorista", "copeira", "jardinagem", "dedetização", "internet",
        "telefonia", "segurança", "combustível", "lubrificante"
    ]
    
    @staticmethod
    def check_geographic(uf: str) -> bool:
        return uf.upper() in ["MA", "PI", "PA"]

    @staticmethod
    def check_semantic(titulo: str) -> bool:
        titulo_lower = titulo.lower()
        
        # 1. Verifica Black List (Bloqueio Imediato)
        for term in FilterEngine.BLACK_LIST:
            if term in titulo_lower:
                return False
                
        # 2. Verifica White List (Liberação)
        for term in FilterEngine.WHITE_LIST:
            if term in titulo_lower:
                return True
                
        return False # Se não caiu em nenhum, rejeita por segurança (ou aprova manualmente depois)

    @staticmethod
    def check_gatekeeper(texto_edital: str) -> tuple[bool, str]:
        """Verifica restrições de ME/EPP"""
        texto_lower = texto_edital.lower()
        if "exclusivo" in texto_lower and ("me" in texto_lower or "epp" in texto_lower):
             return False, "Exclusivo ME/EPP"
        return True, ""

    @staticmethod
    def calculate_priority(titulo: str) -> tuple[str, int]:
        """Calcula prioridade e score baseado em palavras-chave"""
        score = 0
        titulo_lower = titulo.lower()
        
        # Termos de ALTA prioridade (Produtos Core)
        high_value_terms = [
            "medicament", "farmac", "hospital", "enfermagem", "cirurg", 
            "ortoped", "fisioterap", "reagente", "equipamento medico"
        ]
        
        # Termos de MÉDIA prioridade (Consumíveis)
        medium_value_terms = [
            "luva", "seringa", "cateter", "agulha", "algodao", "gaze", 
            "penso", "curativo", "material medico"
        ]
        
        # Cálculo de Score
        for term in high_value_terms:
            if term in titulo_lower:
                score += 30
                
        for term in medium_value_terms:
            if term in titulo_lower:
                score += 10
                
        # Normalização (Max 100)
        score = min(score, 100)
        
        # Definição de Faixa
        if score >= 30:
            return "alta", score
        elif score >= 10:
            return "media", score
        else:
            return "baixa", score
