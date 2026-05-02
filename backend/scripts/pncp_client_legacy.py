import requests
from datetime import datetime, timedelta
import logging

class PNCPClient:
    BASE_URL = "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao"

    def __init__(self):
        self.logger = logging.getLogger("PNCPClient")

    def buscar_oportunidades_recentes(self, dias=3):
        """
        Busca licitações publicadas nos últimos 'dias'.
        Retorna uma lista padronizada de dicionários.
        """
        data_final = datetime.now()
        data_inicial = data_final - timedelta(days=dias)
        
        # Formato exigido: YYYYMMDD
        params = {
            "dataInicial": data_inicial.strftime("%Y%m%d"),
            "dataFinal": data_final.strftime("%Y%m%d"),
            "pagina": 1,
            "tamanhoPagina": 20, 
            "codigoModalidadeContratacao": 6, # 6 = Pregão Eletrônico (Lei 14.133)
            "status": "ABERTA" 
        }

        try:
            print(f"📡 Consultando API PNCP ({data_inicial.date()} a {data_final.date()})...")
            response = requests.get(self.BASE_URL, params=params, timeout=20)
            
            if response.status_code != 200:
                print(f"❌ Erro API PNCP: {response.status_code} - {response.text}")
                return []

            data = response.json()
            licitacoes = []

            # O JSON retornado geralmente tem uma chave 'data' ou é uma lista direta
            # Na API de consulta /publicacao, retorna lista paginada dentro de "data"
            items = data.get("data", [])

            for item in items:
                # Extraindo dados relevantes
                titulo = item.get("objetoCompra", "Sem Objeto")
                orgao = item.get("orgaoEntidade", {}).get("razaoSocial", "Órgão Desconhecido")
                link_detalhes = item.get("linkSistemaOrigem", "")
                
                # Monta resumo para a IA
                resumo = f"""
                Órgão: {orgao}
                Modalidade: {item.get("modalidadeNome", "N/A")}
                Valor Estimado: {item.get("valorTotalEstimado", 0)}
                Data Publicação: {item.get("dataPublicacaoPncp", "")}
                Objeto: {titulo}
                """

                licitacoes.append({
                    "titulo": f"{orgao} - {titulo[:50]}...",
                    "link": link_detalhes if link_detalhes else f"https://pncp.gov.br/app/editais/{item.get('id')}", 
                    "resumo": resumo,
                    "origem": "PNCP API"
                })
            
            print(f"✅ PNCP retornou {len(licitacoes)} editais.")
            return licitacoes

        except Exception as e:
            print(f"❌ Erro ao conectar no PNCP: {e}")
            return []

if __name__ == "__main__":
    # Teste rápido se rodar direto
    client = PNCPClient()
    items = client.buscar_oportunidades_recentes()
    print(items)
