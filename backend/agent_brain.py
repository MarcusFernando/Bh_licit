import os
import time
import json
import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from ai_agent import groq_client

def ler_ultimas_mensagens(db: Session, limite=5):
    return db.query(models.AgentMessage).order_by(models.AgentMessage.id.desc()).limit(limite).all()

def avaliar_e_responder():
    """
    O 'Cérebro' do Agente: 
    Lê o histórico recente, verifica se há algo perguntado para ele ou ações a realizar, e envia uma resposta.
    """
    db = SessionLocal()
    try:
        mensagens = ler_ultimas_mensagens(db)
        if not mensagens:
            return

        # Pega a ultima mensagem recebida (excluindo mensagens do proprio agente)
        # Para evitar loop infinito, o agente só responde se a última msg não for dele
        ultima_msg = mensagens[0]
        if "Especialista em" in ultima_msg.sender or "Agente Crawler" in ultima_msg.sender:
            return

        print(f"🧠 [Agent Brain] Analisando última mensagem: {ultima_msg.content}")

        # Cria prompt com contexto
        contexto_text = "\n".join([f"{m.sender} ({m.created_at}): {m.content}" for m in reversed(mensagens)])
        
        prompt = f"""
        Você é a Inteligência Artificial 'Especialista em Licitações (Servidor)' responsável pelo sistema backend e scraping da BrasilHosp.
        Você se comunica com o 'Agente Comercial - Bryan' ou outros usuários através de um chat neural compartilhado.
        
        Histórico recente do chat:
        {contexto_text}
        
        Sua tarefa: Formular uma resposta à última mensagem se ela for uma saudação, uma pergunta ou um pedido de relatório. 
        Se te pedirem um relatório, você pode propor um documento Markdown, enviando 'requires_approval: True'.
        
        Retorne um JSON com a seguinte estrutura:
        {{
            "should_reply": true/false, // se você deve ou não responder
            "content": "A sua resposta formatada em Markdown",
            "requires_approval": true/false // se a ação proposta precisa de permissão humana
        }}
        """

        if groq_client:
            try:
                completion = groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="llama-3.3-70b-versatile",
                    temperature=0.3,
                    response_format={"type": "json_object"}
                )
                resposta_str = completion.choices[0].message.content
                if "```" in resposta_str:
                    resposta_str = resposta_str.replace("```json", "").replace("```", "")
                
                dados = json.loads(resposta_str)
                
                if dados.get("should_reply"):
                    nova_msg = models.AgentMessage(
                        sender="Especialista em Licitações (Servidor)",
                        content=dados.get("content"),
                        media_url=None,
                        requires_approval=dados.get("requires_approval", False),
                        approval_status="pending" if dados.get("requires_approval") else "approved",
                        created_at=datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    )
                    db.add(nova_msg)
                    db.commit()
                    print("✅ [Agent Brain] Resposta automática enviada.")
            except Exception as e:
                print(f"⚠️ [Agent Brain] Erro na geração da IA: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Agent Brain Iniciado. Aguardando mensagens...")
    while True:
        avaliar_e_responder()
        time.sleep(10) # Polling a cada 10 segundos
