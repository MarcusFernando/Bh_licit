from groq import AsyncGroq
from core.config import settings

class LLMEngine:
    def __init__(self):
        self.client = AsyncGroq(
            api_key=settings.GROQ_API_KEY,
        )
        self.model = "llama-3.3-70b-versatile"

    async def analyze_licitacao(self, title: str, organ: str, details: str = "", status: str = "", rejection_reason: str = "") -> dict:
        """
        Gera uma análise inicial da licitação usando Llama 3.
        Retorna um dicionário com resumo e risco.
        """
        contexto_status = ""
        if status == 'rejeitado':
            contexto_status = f"ATENÇÃO: Este item foi MARCADO COMO REJEITADO pelo sistema. Motivo: '{rejection_reason}'. Avalie se a rejeição faz sentido."
        
        prompt = f"""
        Você é um consultor sênior de licitações para uma Distribuidora de Medicamentos e Produtos Hospitalares (BrasilHosp).
        Nosso foco: Venda de medicamentos, luvas, seringas, gaze, equipamentos médicos.
        NÃO fazemos: Obras, reformas, limpeza, dedetização, locação de veículos, manutenção de ar condicionado.
        
        Analise a seguinte oportunidade:
        Órgão: {organ}
        Objeto: {title}
        Detalhes: {details}
        {contexto_status}
        
        Regras de Potencial:
        - ALTO: Compra direta de medicamentos ou materiais hospitalares em quantidade.
        - MÉDIO: Itens correlatos (móveis hospitalares, equipamentos).
        - BAIXO: Serviços, obras, ou itens fora do nicho (pneus, comida, informática).
        
        Responda em JSON com o seguinte formato:
        {{
            "resumo": "Explicação simples de 1 frase focado no produto",
            "potencial": "Alto/Médio/Baixo",
            "risco": "Riscos técnicos (ex: exigir ANVISA, marca, validade). Se for serviço/obra, avise que foge do escopo.",
            "tags": ["tag1", "tag2"]
        }}
        """
        
        try:
            chat_completion = await self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "Responda sempre em JSON válido. Seja conciso e direto."
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model=self.model,
                temperature=0.3,
                max_tokens=300,
                response_format={"type": "json_object"}
            )
            
            content = chat_completion.choices[0].message.content
            import json
            return json.loads(content)
            
        except Exception as e:
            print(f"Erro no Groq: {e}")
            return {
                "resumo": "Erro na análise automática",
                "potencial": "Desconhecido",
                "risco": f"Erro: {str(e)}",
                "tags": []
            }

    async def extract_items_from_text(self, text: str) -> list:
        """
        Extract structured items from raw PDF text using Llama 3.
        """
        # Truncate text to fit context window (approx 20k chars is safe for Llama 3 70b)
        truncated_text = text[:20000] 
        
        prompt = f"""
        Você é um assistente especialista em extrair tabelas de itens de editais de licitação.
        
        Texto do Edital (Parcial):
        ---
        {truncated_text}
        ---
        
        Sua tarefa: IDENTIFICAR e EXTRAIR a lista de itens/lotes que estão sendo licitados.
        Procure por padrões como: "Item 1", "Lote 01", "Descrição", "Quantidade", "Unidade".
        Ignore textos jurídicos, cabeçalhos e rodapés. Foque apenas na TABELA DE ITENS ou LISTA DE OBJETOS.
        
        Retorne APENAS um JSON com a lista de itens no formato:
        [
            {{
                "numero_item": 1, 
                "descricao": "Descrição detalhada do produto (sem códigos)", 
                "quantidade": 100.0, 
                "unidade": "CX/UN/KG", 
                "valor_unitario": 0.00 (se houver estimado, senão 0)
            }}
        ]
        Se não encontrar itens, retorne lista vazia [].
        Se a quantidade for incerta, estime 1.
        Se o valor unitário não constar, use 0.
        """
        
        try:
            chat_completion = await self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "Você é um extrator de dados JSON. Retorne apenas JSON válido."
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model=self.model,
                temperature=0.1, # Low temperature for precision
                max_tokens=2048,
                response_format={"type": "json_object"}
            )
            
            content = chat_completion.choices[0].message.content
            import json
            data = json.loads(content)
            # Handle if LLM returns {"items": [...]} wrapper
            if isinstance(data, dict):
                return data.get("items", data.get("itens", []))
            return data if isinstance(data, list) else []
            
        except Exception as e:
            print(f"Erro na extração de itens: {e}")
            return []

    async def close(self):
        await self.client.close()
