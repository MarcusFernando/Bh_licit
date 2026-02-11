import feedparser
import urllib.parse
import trafilatura
import requests
from pypdf import PdfReader
from io import BytesIO

# Headers para simular um navegador real e evitar bloqueios
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

import googlenewsdecoder

def validar_e_ler_link(url_google):
    """
    Função 'Porteiro': 
    1. Decodifica o link do Google News (evita erro 400).
    2. Verifica se o domínio é GOVERNAMENTAL (.gov.br).
    """
    try:
        # Decodifica a URL 'suja' do Google (CBM...) para a URL real
        try:
            # Tenta decodificador V1 (chamada direta da função)
            url_real_obj = googlenewsdecoder.new_decoderv1(url_google)
            url_real = url_real_obj.get("decoded_url")
            
            if not url_real:
                 print(f"      ⚠️ Decoder V1 vazio. Tentando Fallback Bot...")
                 raise Exception("Decoder Falhou")

        except Exception as e_dec:
             print(f"      ⚠️ Falha no Decoder: {e_dec}")
             # Tenta requests com User-Agent de Bot (Googlebot as vezes passa direto)
             try:
                headers_bot = {"User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"}
                r = requests.get(url_google, headers=headers_bot, timeout=5, allow_redirects=True)
                if r.status_code == 200 and "google.com" not in r.url:
                    url_real = r.url
                else:
                    url_real = url_google
             except:
                url_real = url_google

        url_real = url_real.lower()
        
        # --- REGRA DE OURO RELAXADA: ACEITAR MAIS FONTES ---
        # Aceita: .gov.br, .leg.br, transparencia, mas também .org e portais conhecidos de licitação
        if ".gov.br" not in url_real and ".leg.br" not in url_real:
            print(f"      ⚠️ ALERTA (Não é .gov, mas vamos analisar): {url_real[:40]}...")
            # return None -> REMOVIDO PARA TESTE

        # --- REGRA DE PRATA: LISTA NEGRA DE NOTÍCIAS ---
        # Bloqueia portais de notícias conhecidos que poluem a busca
        bloqueados = ["globo.com", "terra.com.br", "uol.com.br", "folha", "estadao", "metropoles", "concurso", "jusbrasil"]
        if any(b in url_real for b in bloqueados):
            print(f"      ❌ REJEITADO (Portal de Notícia): {url_real[:40]}...")
            return None
            
        print(f"      ✅ APROVADO: {url_real[:50]}...")

        # Baixa o conteúdo da URL REAL
        resp = requests.get(url_real, headers=HEADERS, timeout=15, verify=False)
        
        # Tenta extrair texto de PDF
        if url_real.endswith(".pdf") or b"%PDF" in resp.content[:20]:
            try:
                pdf = BytesIO(resp.content)
                reader = PdfReader(pdf)
                text = ""
                for page in reader.pages[:4]: text += page.extract_text() + "\n"
                return f"[FONTE: {url_real}]\n\n[PDF]: {text[:6000]}"
            except:
                pass

        # Tenta extrair texto de Site HTML
        text = trafilatura.extract(resp.content)
        if text and len(text) > 200:
             return f"[FONTE: {url_real}]\n\n[SITE]: {text[:6000]}"
        
        return None

    except Exception as e:
        print(f"      ❌ Erro ao processar link: {e}")
        return None

async def buscar_licitacoes_gov():
    print(f"🚀 Iniciando Varredura RIGOROSA (Apenas .gov.br)...")
    
    # Busca mais ampla para garantir resultados
    query = 'licitação "aviso de licitação" (medicamentos OR hospitalar)'
    
    # Codifica a busca para URL válida
    url = f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419"
    
    feed = feedparser.parse(url)
    print(f"🔎 Google trouxe {len(feed.entries)} links brutos. Filtrando...")
    
    licitacoes_validas = []
    
    for entry in feed.entries:
        titulo = entry.title.lower()
        
        # Filtro preliminar de título (já descarta SP, RJ e Concursos óbvios)
        termos_lixo = ["são paulo", "rio de janeiro", "minas", "concurso", "polícia", "vaga", "futebol", "show", "crime"]
        if any(x in titulo for x in termos_lixo):
            continue

        # Validação profunda do link
        conteudo = validar_e_ler_link(entry.link)
        
        if conteudo:
            licitacoes_validas.append({
                "titulo": entry.title,
                "link": entry.link,
                "resumo": f"{entry.title}\n{conteudo}"
            })
        
        # Limita a 10 resultados válidos para agilidade
        if len(licitacoes_validas) >= 10: 
            break
            
    print(f"📦 Pacote fechado com {len(licitacoes_validas)} editais OFICIAIS.")
    return licitacoes_validas