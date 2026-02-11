import ai_agent
import logging

logger = logging.getLogger("AIService")

class AIService:
    @staticmethod
    async def analisar_oportunidades(lista_dados):
        """
        Wrapper para o agente de IA.
        Recebe lista bruta e retorna lista enriquecida com score/resumo.
        """
        if not lista_dados:
            return []
            
        print(f"🧠 [AI Service] Analisando {len(lista_dados)} itens...")
        try:
            # Usa a implementação robusta do ai_agent (com fallback interno)
            resultados = await ai_agent.analisar_lote_licitacoes_async(lista_dados)
            return resultados
        except Exception as e:
            logger.error(f"Erro crítico na IA: {e}")
            # Em caso de catástrofe total, retorna vazio ou fallback manual extremo
            return []
