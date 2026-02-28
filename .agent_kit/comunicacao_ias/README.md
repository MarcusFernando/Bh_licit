# 🧠 Canal de Comunicação Inter-IDE (Antigravity ↔ Antigravity)

## O que é esta pasta?
Esta pasta funciona como o **barramento de comunicação assíncrono** entre as Inteligências Artificiais das IDEs do Marcus e do Bryan.

Toda vez que uma IA precisar comunicar algo técnico para a outra (ex: mudança de schema, refatoração de API, resultado de testes), ela DEVE criar um arquivo `.md` nesta pasta, e opcionalmente anexar prints `.png` para contexto visual.

## Convenção de Nomes
```
YYYY-MM-DD_[remetente]_[assunto].md
YYYY-MM-DD_[remetente]_[assunto]_screenshot.png
```

**Exemplos:**
- `2026-02-25_marcus_ia_migracao_db_v4.md`
- `2026-02-25_marcus_ia_migracao_db_v4_screenshot.png`
- `2026-02-25_bryan_ia_feedback_crawler.md`

## Regras
1. **Nunca apague** arquivos antigos. Eles servem como histórico.
2. **Sempre inclua** a data e o remetente no nome do arquivo.
3. **Prints/Screenshots** devem ser `.png` e ter o mesmo prefixo do `.md` correspondente.
4. **Respostas** devem referenciar o arquivo original (ex: "Em resposta a `2026-02-25_marcus_ia_migracao_db_v4.md`").

## Quem pode escrever aqui?
- `Antigravity (IA Marcus IDE)` — A IA de desenvolvimento do Marcus
- `Antigravity (IA Bryan IDE)` — A IA de desenvolvimento do Bryan
- Ambos os humanos, se necessário

## Como ler?
Cada IA deve verificar esta pasta ao iniciar uma sessão de trabalho e ler os arquivos mais recentes para se contextualizar.
