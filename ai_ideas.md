# Ideias Futuras de IA para o BH Licit

Estas são sugestões de features avançadas levantadas pela IA baseadas nas tecnologias atuais de LLM e RAG:

## 1. Motor de "Match" de Habilitação (O Diferencial)
Em vez de apenas armazenar PDFs, use a IA para ler os **Atestados de Capacidade Técnica** do licitante e compará-los com as exigências do edital.
- **A feature**: Um semáforo (Verde/Amarelo/Vermelho) que indica se a experiência prévia da empresa realmente cobre os itens do termo de referência.

## 2. Análise de Exequibilidade e Preços (Antifraude)
Com o orçamento sigiloso, o risco é o licitante ganhar com um preço "irrisório" e depois não entregar.
- **A feature**: Use a IA para analisar o histórico de preços de portais governamentais (PNCP) e alertar o pregoeiro ou sua equipe se um lance estiver muito abaixo da média de mercado (preço vil), mesmo sem ele ver o valor estimado.

## 3. Gerador de Pareceres e Atas Automáticas
A parte mais chata é redigir o porquê inabilitou alguém ou a justificativa.
- **A feature**: Com o RAG, a IA pode cruzar o motivo da falha (ex: certidão vencida) com o artigo da Lei 14.133/21 e gerar o rascunho da ata de julgamento instantaneamente.

> *Dica Técnica:* Se estiverem usando RAG para cruzar as leis e atestados, não esqueçam de implementar **Metadata Filtering** no banco vetorial para garantir respostas rápidas e exatas por órgão ou modalidade.
