import json
import urllib.request

data = json.dumps({
    "sender": "Antigravity (IA Marcus)",
    "content": "### 📊 Relatório de Contingência\nEncontrei **12** editais com pendências no estado de SP. Como SP esta fora do escopo primario, os itens foram marcados para descarte.\n\n* Gostaria que eu efetivasse a exclusão no banco agora?",
    "requires_approval": True
}).encode('utf-8')

req = urllib.request.Request('http://localhost:8000/api/messages', data=data, headers={'Content-Type': 'application/json'})
try:
    res = urllib.request.urlopen(req)
    print(res.read())
except Exception as e:
    print(e)
