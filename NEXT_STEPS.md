# 🚀 Próximos Passos: Deploy & Colaboração V3

## 1. Status Atual
- **Branch Atual:** `v3-collab` (Desenvolvimento da V3)
- **Branch Estável:** `main` (Versão V2 com Leitor de Edital e Dashboard Polido)
- **Documentação:** `README.md` completo criado na raiz.

## 2. Enviando para o GitHub (Seu PC)
Como criamos o repositório localmente, agora precisamos conectar com o GitHub.
Crie um repositório vazio no GitHub chamado `bh-licit-v2`.

No seu terminal (dentro da pasta do projeto), rode:

```powershell
# Adiciona a origem remota
git remote add origin https://github.com/MarcusFernando/bh-licit-v2.git

# Envia a branch main (Estável)
git push -u origin main

# Envia a branch de desenvolvimento (V3)
git push -u origin v3-collab
```

## 3. Rodando a Versão do Bryan (Amigo) em Paralelo
Para testar a versão dele sem parar a sua, clone em uma pasta separada e mude as portas.

1.  **Clone o repo dele:**
    ```powershell
    cd ..
    git clone https://github.com/Bryanmdev/bh-licit.git bh-licit-bryan
    cd bh-licit-bryan
    ```

2.  **Edite o `docker-compose.yml` dele:**
    Abra o arquivo e altere as portas para não conflitar com as suas (3000/8000).

    ```yaml
    # Exemplo de alteração
    licitacoes_api:
      ports:
        - "8001:8000"  # Porta 8001 para API

    licitacoes_web:
      ports:
        - "3001:3000"  # Porta 3001 para Frontend
    ```

3.  **Rode a versão dele:**
    ```powershell
    docker compose up --build -d
    ```

4.  **Acesse:**
    - Sua versão: http://localhost:3000
    - Versão do Bryan: http://localhost:3001

## 4. Banco de Dados Compartilhado (Arquitetura Cliente-Servidor)
**IMPORTANTE:** O Bryan **NÃO** precisa instalar PostgreSQL no PC dele. Isso vai criar dois bancos separados e os dados não vão bater.
O ideal é ele conectar no **SEU** banco (Docker), já que vocês estão na mesma rede (ou VPN).

### Passo 1: Descubra seu IP Local
No seu terminal, digite `ipconfig` e pegue o endereço IPv4 (ex: `192.168.1.15`).

### Passo 2: Configure o Bryan
No projeto dele, ele deve criar um arquivo `.env` (ou editar o código, já que ele não usa docker) com:
```env
# Ele aponta para o SEU IP
DATABASE_URL=postgresql://admin:admin123@192.168.1.15:5432/licitacoes
```

### Passo 3: Liberar Acesso (Se necessário)
Se ele não conseguir conectar, pode ser o Firewall do Windows.
- Abra "Windows Defender Firewall com Segurança Avançada"
- Regras de Entrada -> Nova Regra -> Porta -> TCP -> 5432 -> Permitir Conexão -> Avançar -> Nome: "Postgres Docker"

Assim, o PC dele vira apenas um "Cliente" e o seu vira o "Servidor". Ambos veem as mesmas licitações! 🚀
