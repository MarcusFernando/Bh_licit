import google.generativeai as genai
import json
import os
from core.config import settings

class LLMEngine:
    def __init__(self):
        # Configure Gemini
        gemini_key = os.getenv("GEMINI_API_KEY", settings.GROQ_API_KEY) # Try to get dedicated key or use existing
        genai.configure(api_key=gemini_key)
        self.model_name = 'gemini-2.5-flash'

    async def analyze_licitacao(self, title: str, organ: str, details: str = "", status: str = "", rejection_reason: str = "", full_text: str = "", source_label_override: str = None) -> dict:
        """
        Gera uma análise profunda usando Gemini 2.5 Flash.
        """
        contexto_status = ""
        if status == 'rejeitado':
            contexto_status = f"ATENÇÃO: Este item foi MARCADO COMO REJEITADO. Motivo: '{rejection_reason}'."
        
        # Determine how much text to use (Gemini 2.5 handles huge context)
        # Note: we explicitly label the source for the AI to avoid hallucination
        if source_label_override:
            source_label = source_label_override
        else:
            source_label = "LIDO DO EDITAL COMPLETO" if full_text else "APENAS DADOS BÁSICOS (PDF não disponível)"

        prompt = f"""
        Você é o Consultor Estratégico Neural Sênior da BrasilHosp.
        
        SINTETIZE O PARECER PARA ESTA LICITAÇÃO.
        FONTE: {source_label}

        DADOS BÁSICOS DO SISTEMA:
        - Órgão: {organ}
        - Objeto Principal: {title}
        - Outros Detalhes: {details}
        {contexto_status}
        
        CONTEÚDO EXTRAÍDO DO EDITAL (PDF):
        {full_text if full_text else "--- NÃO FOI POSSÍVEL ACESSAR O PDF COMPLETO ---"}

        CRITÉRIOS BRASILHOSP:
        - FOCO TOTAL: Medicamentos, Materiais Hospitalares, Insumos de Saúde.
        - DESCARTE: Obras, TI, Serviços de Limpeza, Pneus, Veículos.
        
        INSTRUÇÃO CRÍTICA ME/EPP:
        - Verifique termos como: "Participação Exclusiva Me/Epp", "Cota Reservada (Até 25%)", "Lei Complementar 123/2006", "Artigo 48".
        - Se encontrar cotas ou itens exclusivos, o status DEVE ser 'parcial' ou 'exclusivo'.

        INSTRUÇÃO CRÍTICA HABILITAÇÃO:
        - Procure ativamente pelos "Requisitos de Habilitação" (Geralmente no Item 9, 8 ou 10 do Edital).
        - Extraia exigências difíceis como: AFE da ANVISA, CRF, Balanço Financeiro registrado, Qualificação Técnico-Operacional, etc.

        Responda em JSON rigoroso de acordo com a seguinte estrutura:
        {{
            "resumo": "Uma frase clara e comercial sobre o que é o edital",
            "potencial": "Alta" | "Média" | "Baixa" | "Nula",
            "risco": "Destaque exigências técnicas, logísticas ou de ME/EPP. Se você NÃO leu o PDF, deixe claro o risco de dados incompletos.",
            "tags": ["medicamentos", "maranhao", "urgente", "me_epp_identificada", etc],
            "me_epp_status": "exclusivo" | "parcial" | "nao",
            "habilitacao_resumo": "Resumo em tópicos (bullet points) das principais exigências de habilitação encontradas no documento. Foque no crítico (ANVISA, capital social, etc). Se não encontrar, retorne null.",
            "valor_estimado": "Valor financeiro total ou anual estimado da licitação (apenas o número float, ex: 1250000.50). Retorne null se não encontrar valor claro."
        }}
        """
        
        try:
            model = genai.GenerativeModel(self.model_name, generation_config={"response_mime_type": "application/json"})
            response = await model.generate_content_async(prompt)
            print(f"✨ Gemini 2.5 analisou Licitação. Fonte: {source_label}")
            return json.loads(response.text)
            
        except Exception as e:
            print(f"Erro no Gemini: {e}")
            # Fallback local logic or simplified return
            return {
                "resumo": "Erro na análise profunda. Verifique sua GEMINI_API_KEY.",
                "potencial": "Erro",
                "risco": str(e),
                "tags": ["erro_ia"],
                "me_epp_status": "nao",
                "habilitacao_resumo": "Erro ao carregar análise de habilitação."
            }

    async def extract_items_from_text(self, text: str) -> list:
        """
        Extrai itens estruturados do texto usando Gemini 2.0 (Muito mais potente que o Llama 3 para isso).
        """
        prompt = f"""
        Você é um extrator de itens de editais. 
        Converta o texto abaixo em uma lista JSON de objetos.
        
        TEXTO:
        {text[:1000000]}
        
        JSON FORMAT: [{{ "numero_item": int, "descricao": str, "quantidade": float, "unidade": str, "valor_unitario": float }}]
        """
        try:
            model = genai.GenerativeModel(self.model_name, generation_config={"response_mime_type": "application/json"})
            response = await model.generate_content_async(prompt)
            return json.loads(response.text)
        except Exception as e:
            print(f"Erro extração Gemini: {e}")
            return []

    async def close(self):
        pass # Google AI Studio client doesn't need manual close like session clients
