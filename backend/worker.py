import asyncio
from arq import create_pool
from arq.connections import RedisSettings
import os
import models
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from database import engine

# Importação dos novos serviços
from services.ingestion_service import IngestionService
from services.ai_service import AIService

# Configuração do Redis
REDIS_HOST = os.getenv("REDIS_HOST", "licitacoes_redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

async def startup(ctx):
    print("🚀 Worker iniciado! Conectado ao Redis.")

async def shutdown(ctx):
    print("👋 Worker desligando...")

async def task_processar_licitacoes(ctx, batch_id: str):
    """
    Tarefa assíncrona executada em segundo plano.
    Refatorada para usar Service Layer pattern.
    """
    print(f"🔄 [Worker] Iniciando processamento do lote {batch_id}...")
    
    # 1. Coleta (Ingestion Service)
    dados_coletados = await IngestionService.buscar_todas_oportunidades()
    
    if not dados_coletados:
        print("⚠️ [Worker] Nenhuma licitação nova encontrada.")
        return "Sem dados"

    # 2. Filtragem e Persistência
    # O Worker atua como orquestrador, decidindo o que salvar
    try:
        async with AsyncSession(engine) as db:
            novos_para_analise = []
            # Filtra duplicados
            for item in dados_coletados:
                stmt = select(models.Licitacao).where(models.Licitacao.titulo == item['titulo'])
                result = await db.exec(stmt)
                existe = result.first()
                if not existe:
                    item['temp_id'] = str(len(novos_para_analise))
                    novos_para_analise.append(item)
        
        print(f"📦 [Worker] {len(novos_para_analise)} itens novos para analisar.")
        
        if novos_para_analise:
            # Batching para IA
            tamanho_lote = 5
            for i in range(0, len(novos_para_analise), tamanho_lote):
                lote_atual = novos_para_analise[i : i + tamanho_lote]
                
                # Chama AI Service (Encapsula a complexidade do agente)
                resultados_ia = await AIService.analisar_oportunidades(lote_atual)
                
                for item_raw in lote_atual:
                    analise = next((x for x in resultados_ia if str(x.get("id_interno")) == item_raw['temp_id']), None)
                    
                    if not analise:
                         analise = {"resumo": "Processado via Contingência", "nota": 0, "risco": "Review Manual"}

                    import hashlib
                    # Cria um hash único para simular PNCP ID (já que vem de fontes variadas)
                    hash_id = hashlib.md5(f"{item_raw['titulo']}_{item_raw['link']}".encode()).hexdigest()[:20]
                    # Extrai sigla básica do órgão para estado
                    orgao = item_raw.get("origem", "Automacao")
                    estado = "BR" # Default fallback
                    if "-" in orgao and len(orgao.split("-")[-1].strip()) == 2:
                        estado = orgao.split("-")[-1].strip()
                        
                    # Mapeia as notas para prioridade do BD do Bryan
                    try:
                        nota = int(analise.get("nota", 0))
                    except (ValueError, TypeError):
                        nota = 0
                    prioridade = "Não Avaliado"
                    if nota >= 80: prioridade = "Alta"
                    elif nota >= 50: prioridade = "Média"
                    elif nota > 0: prioridade = "Baixa"

                    nova_licitacao = models.Licitacao(
                        pncp_id=f"hash_{hash_id}",
                        titulo=item_raw['titulo'],
                        orgao_nome=orgao,
                        estado_sigla=estado,
                        link_edital=item_raw['link'],
                        # Campos OBRIGATÓRIOS no banco do Bryan
                        is_me_epp_exclusive=False,
                        status='pendente',
                        priority=prioridade,
                        score=nota,
                        # Nossas colunas adicionais para IA
                        resumo_ia=str(analise.get("resumo", "") or ""),
                        risco=str(analise.get("risco", "N/A") or "N/A")
                    )
                    db.add(nova_licitacao)
                
                await db.commit()
                print(f"✅ [Worker] Lote {i} salvo no banco.")
                await asyncio.sleep(2)
            
            # Envia mensagem no Chat Neural avisando da coleta
            try:
                import datetime
                msg_bot = models.AgentMessage(
                    sender="Agente Crawler - Marcus",
                    content=f"🔍 Acabei de processar e analisar {len(novos_para_analise)} novas licitações no Master Data! Já estão disponíveis para o Comercial.",
                    media_url=None,
                    created_at=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                )
                db.add(msg_bot)
                await db.commit()
            except Exception as e:
                print(f"⚠️ Erro ao enviar mensagem bot: {e}")
            
    except Exception as e:
        print(f"❌ Erro no Worker: {e}")

    return f"Processado {len(novos_para_analise)} itens."

# Configuração da Classe Worker para o Arq rodar
class WorkerSettings:
    functions = [task_processar_licitacoes]
    redis_settings = RedisSettings(host=REDIS_HOST, port=REDIS_PORT)
    on_startup = startup
    on_shutdown = shutdown
