---
description: Sincroniza alterações com o GitHub (commit + push automático)
---

# Sync com GitHub

Este workflow faz o commit e push automático de todas as alterações pendentes para o repositório remoto.

## Passos

1. Verificar status do git
```bash
git status --short
```

// turbo
2. Adicionar todos os arquivos modificados
```bash
git add -A
```

// turbo
3. Fazer commit com mensagem descritiva
```bash
git commit -m "sync: atualização automática das IAs [agent_kit + backend + frontend]"
```

// turbo
4. Fazer push para o branch atual
```bash
git push
```

5. Confirmar que o push foi bem-sucedido
```bash
git log -n 1 --oneline
```
