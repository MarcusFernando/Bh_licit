import google.generativeai as genai
from groq import Groq
import json
import os
import asyncio

# ==========================================================
# CONFIGURAÇÃO MULTI-MODELO
# ==========================================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "SUA_CHAVE_AQUI")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "") # Se vazio, usa só Gemini ou Fallback

# Cliente Groq (Llama 3 é muito rápido e free)
groq_client = None
if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
    except:
        print("Erro ao iniciar Groq Client")

# Cliente Gemini
genai.configure(api_key=GEMINI_API_KEY)

def analise_contingencia_rigorosa(item):
    """
    MODO OFFLINE/FALLBACK: Analisa usando lógica Python estrita.
    """
    texto = (str(item['titulo']) + " " + str(item['resumo'])).upper()
    nota = 0
    riscos = []

    # --- 1. KILL SWITCH (MATADOURO DE LIXO) ---
    lixo_geo = ["SÃO PAULO", " SP ", "RIO DE JANEIRO", " RJ ", "MINAS GERAIS", " MG ", "PARANÁ", " PR ", "SANTA CATARINA", " SC ", "BRASÍLIA", " DF "]
    for lixo in lixo_geo:
        if lixo in texto:
            return {
                "id_interno": item.get('temp_id'),
                "resumo": f"REJEITADO (GEO): Documento menciona {lixo.strip()}.",
                "nota": 0,
                "risco": f"Fora da Região",
                "justificativa": "Filtro geográfico."
            }
            
    # --- 2. PONTUAÇÃO POSITIVA ---
    if any(loc in texto for loc in ["MARANH", "MA ", "PIAU", "PI ", "PARA ", "PA "]):
        nota += 40
    
    termos_ouro = ["MEDICAMENT", "HOSPITALAR", "ODONTO", "FARMAC", "ENFERMAGEM"]
    if any(t in texto for t in termos_ouro):
        nota += 50
        resumo_final = "Edital compatível (Termos chave encontrados)."
    else:
        riscos.append("Não citou medicamentos explicitamente")
        resumo_final = "Texto genérico."

    return {
        "id_interno": item.get('temp_id'),
        "resumo": resumo_final,
        "nota": min(nota, 100),
        "risco": ", ".join(riscos) if riscos else "Nenhum risco óbvio."
    }

async def analisar_lote_licitacoes_async(lista_licitacoes):
    """
    Gerenciador Inteligente de IA:
    1. Tenta GROQ (Llama 3) -> Rápido e Free.
    2. Se falhar, tenta GEMINI (Flash Lite).
    3. Se falhar, usa PYTHON PURO (Logica não falha).
    """
    
    prompt_texto = f"""
    Você é um especialista em licitações da BrasilHosp.
    Analise os itens abaixo e retorne um JSON array.
    Regras:
    1. Prioridade: Medicamentos no MA, PI, PA.
    2. Rejeite Obras e estados do Sul/Sudeste.
    3. Retorne campos: id_interno, resumo, nota (0-100), risco.
    
    DADOS: {json.dumps([{'id_interno': x['temp_id'], 'texto': x['titulo'] + ' ' + x['resumo'][:400]} for x in lista_licitacoes])}
    """

    # --- TENTATIVA 1: GROQ ---
    resultados = []
    
    if groq_client:
        try:
            print("🤖 Tentando Groq (Llama3)...")
            completion = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a JSON machine. Return ONLY a raw JSON array. One object for each input item."}, 
                    {"role": "user", "content": prompt_texto}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0,
            )
            content = completion.choices[0].message.content
            # Limpeza
            if "```" in content:
                content = content.replace("```json", "").replace("```", "")
            resultados = json.loads(content)
        except Exception as e:
            print(f"⚠️ Erro no Groq: {e}.")
            # AQUI MUDOU: Se Groq falhar, ele NÃO tenta Gemini automaticamente
            # Ele vai cair direto no bloco de validacao final que usa Python

    # --- TENTATIVA 2: GEMINI (TERCIÁRIO - SÓ SE GROQ FALHOU E MANUALMENTE ATIVADO) ---
    # O usuário pediu: 1. Groq -> 2. Python -> 3. Gemini
    # Portanto, se 'resultados' estiver vazio aqui, deixamos vazio propositalmente
    # para que o loop final use 'analise_contingencia_rigorosa' (Python).
    
    if not resultados and False: # Desabilitado por padrão (use True para ativar Terciário)
        try:
            print("✨ Tentando Gemini (Backup)...")
            # Atualizado para evitar erro 404
            model = genai.GenerativeModel('gemini-1.5-flash-latest', generation_config={"response_mime_type": "application/json"})
            response = await model.generate_content_async(prompt_texto)
            resultados = json.loads(response.text)
        except Exception as e:
            print(f"⚠️ Erro no Gemini: {e}")

    # --- GARANTIA DE INTEGRIDADE (MUITO IMPORTANTE) ---
    # Verifica se TODOS os itens da entrada receberam uma analise.
    # Se a IA pulou algum item (alucinação) ou falhou, passamos o Python Fallback neles.
    
    lista_final = []
    
    # Cria mapa de resultados por ID para busca rápida
    mapa_resultados = {str(r.get("id_interno")): r for r in resultados} if resultados else {}

    for item in lista_licitacoes:
        id_item = str(item['temp_id'])
        
        if id_item in mapa_resultados:
            # Item foi analisado pela IA
            lista_final.append(mapa_resultados[id_item])
        else:
            # IA esqueceu deste item -> Roda Fallback Python
            print(f"⚠️ Item {id_item} ignorado pela IA. Rodando Fallback...")
            lista_final.append(analise_contingencia_rigorosa(item))
            
    return lista_final


async def analisar_edital_completo(texto_pdf):
    """
    Analisa o texto completo de um edital PDF usando o cérebro mais potente (Gemini 2.0).
    Extrai: Data, Objeto, Orgão, Valor e status ME/EPP detalhado.
    """
    prompt = f"""
    Você é um extrator de dados de licitações sênior da BrasilHosp.
    Sua tarefa é ler TODO o edital abaixo e extrair informações críticas com 100% de precisão.
    
    TEXTO DO EDITAL:
    {texto_pdf[:1000000]}  # Expandido para 1 milhão de caracteres para o Gemini 2.0
    
    Instruções Especiais:
    1. ME/EPP: Verifique se existem COTAS RESERVADAS ou se ITENS ESPECÍFICOS são exclusivos para ME/EPP, mesmo que o título geral não diga.
    2. VALOR: Busque pelo valor total estimado da contratação.

    Retorne APENAS um JSON com estas chaves:
    - "orgao": Nome do orgão/prefeitura
    - "edital": Número do edital/pregão
    - "objeto": Descrição resumida do objeto
    - "data_abertura": Data e hora de abertura (ex: "22/07/2019 09:00")
    - "valor_estimado": Valor total estimado (numérico ou null)
    - "me_epp_status": "exclusivo", "parcial" ou "nao" (se houver cotas para ME/EPP, use "parcial")
    
    Se não encontrar algum dado, retorne null.
    """
    
    # Tenta Gemini 2.5 Flash por primeiro (Cérebro Atualizado)
    try:
        print("✨ Usando Cérebro Gemini 2.5 Flash para Edital Completo...")
        model = genai.GenerativeModel('gemini-2.5-flash', generation_config={"response_mime_type": "application/json"})
        response = await model.generate_content_async(prompt)
        return json.loads(response.text)
    except Exception as e:
        print(f"⚠️ Erro no Gemini 2.0: {e}. Tentando fallback Groq...")
        
        # Fallback para Groq (Llama 3) - Note que aqui o limite é menor
        if groq_client:
            try:
                completion = groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt[:30000]}],
                    model="llama-3.3-70b-versatile",
                    temperature=0,
                )
                content = completion.choices[0].message.content
                if "```" in content:
                    content = content.replace("```json", "").replace("```", "")
                return json.loads(content)
            except Exception as e:
                print(f"Erro Crítico em todos os modelos: {e}")
                return {"error": "Falha total na análise IA"}
    
    return {"error": "Nenhum modelo disponível"}

# Mantendo compatibilidade com código antigo sincrono se precisar
def analisar_lote_licitacoes(lista):
    return asyncio.run(analisar_lote_licitacoes_async(lista))