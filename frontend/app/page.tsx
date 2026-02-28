"use client";

import { useState, useEffect, useMemo } from "react";
import { Icons } from "./icons";
import { buscarLicitacoes, rodarRobo, deleteLicitacao, retryLicitacao, buscarMensagens, enviarMensagem, aprovarMensagem } from "./api";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';

interface AgentMessage {
  id: number;
  sender: string;
  content: string;
  requires_approval?: boolean;
  approval_status?: string;
  created_at?: string;
}

interface Licitacao {
  id: number;
  titulo: string;
  descricao: string;
  resumo_ia: string;
  score_interesse: number;
  risco: string;
  link_edital: string;
  orgao: string;
  data_abertura?: string;
  valor_estimado?: string;
}

// Helper para Busca Difusa (Fuzzy Search)
// Suporta erros de digitação como "munciop" → "municipio"
function fuzzyMatch(text: string, query: string): boolean {
  if (!text || !query) return false;
  const s = text.toLowerCase();
  const q = query.toLowerCase().trim();

  // 1. Busca exata (substring)
  if (s.includes(q)) return true;

  // 2. Para query curta (< 3 chars), só busca exata
  if (q.length < 3) return false;

  // 3. Busca por similaridade em cada palavra do texto
  const words = s.split(/\s+/);
  for (const word of words) {
    // Pula palavras muito curtas
    if (word.length < 3) continue;

    // Compara similaridade de caracteres (ignora ordem)
    const similarity = charSimilarity(word, q);
    if (similarity >= 0.65) return true;
  }

  // 4. Tenta match parcial: a query aparece como início de alguma palavra?
  for (const word of words) {
    if (word.startsWith(q.slice(0, Math.max(3, q.length - 2)))) return true;
  }

  return false;
}

// Calcula similaridade por sobreposição de caracteres (order-independent)
function charSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;

  // Conta quantos caracteres da string menor existem na maior
  const longerChars = longer.split("");
  let matched = 0;
  const used = new Set<number>();

  for (const ch of shorter) {
    const idx = longerChars.findIndex((c, i) => c === ch && !used.has(i));
    if (idx !== -1) {
      matched++;
      used.add(idx);
    }
  }

  return matched / longer.length;
}

// Calcula score de relevância para ordenação (quanto maior, melhor)
function getMatchScore(item: Licitacao, query: string): number {
  if (!query) return 0;
  const q = query.toLowerCase().trim();
  let score = 0;

  // Peso 100: Título exato ou muito similar
  if (item.titulo?.toLowerCase().includes(q)) score += 100;
  else if (fuzzyMatch(item.titulo, q)) score += 50;

  // Peso 80: Órgão
  if (item.orgao?.toLowerCase().includes(q)) score += 80;
  else if (fuzzyMatch(item.orgao, q)) score += 40;

  // Peso 20: Descrição/Resumo
  if (item.descricao?.toLowerCase().includes(q)) score += 20;
  else if (fuzzyMatch(item.descricao, q)) score += 10;

  if (item.resumo_ia?.toLowerCase().includes(q)) score += 20;
  else if (fuzzyMatch(item.resumo_ia, q)) score += 10;

  return score;
}

// Extrai UF do nome do orgao (ex: "PREFEITURA DE ITAPEVI" -> busca no mapa de cidades)
function extrairUF(orgao: string): string {
  if (!orgao) return "";
  const upper = orgao.toUpperCase();
  // Map of known state keywords
  const estados: Record<string, string> = {
    "MINAS GERAIS": "MG", "BELO HORIZONTE": "MG", " MG": "MG",
    "SÃO PAULO": "SP", "SAO PAULO": "SP", " SP": "SP",
    "RIO DE JANEIRO": "RJ", " RJ": "RJ",
    "BAHIA": "BA", "SALVADOR": "BA", " BA": "BA",
    "PARANÁ": "PR", "PARANA": "PR", "CURITIBA": "PR", " PR": "PR",
    "RIO GRANDE DO SUL": "RS", "PORTO ALEGRE": "RS", " RS": "RS",
    "SANTA CATARINA": "SC", " SC": "SC",
    "GOIÁS": "GO", "GOIAS": "GO", "GOIÂNIA": "GO", " GO": "GO",
    "PERNAMBUCO": "PE", "RECIFE": "PE", " PE": "PE",
    "CEARÁ": "CE", "CEARA": "CE", "FORTALEZA": "CE", " CE": "CE",
    "PARÁ": "PA", "PARA": "PA", "BELÉM": "PA", "BELEM": "PA", " PA": "PA",
    "MARANHÃO": "MA", "MARANHAO": "MA", "SÃO LUÍS": "MA", "SAO LUIS": "MA", " MA": "MA",
    "AMAZONAS": "AM", "MANAUS": "AM", " AM": "AM",
    "ESPÍRITO SANTO": "ES", "ESPIRITO SANTO": "ES", "VITÓRIA": "ES", " ES": "ES",
    "PIAUÍ": "PI", "PIAUI": "PI", " PI": "PI",
    "MATO GROSSO DO SUL": "MS", " MS": "MS",
    "MATO GROSSO": "MT", " MT": "MT",
    "DISTRITO FEDERAL": "DF", "BRASÍLIA": "DF", "BRASILIA": "DF", " DF": "DF",
    "TOCANTINS": "TO", " TO": "TO",
    "ALAGOAS": "AL", " AL": "AL",
    "SERGIPE": "SE", " SE": "SE",
    "RONDÔNIA": "RO", "RONDONIA": "RO", " RO": "RO",
    "ACRE": "AC", " AC": "AC",
    "AMAPÁ": "AP", "AMAPA": "AP", " AP": "AP",
    "RORAIMA": "RR", " RR": "RR",
    "PARAÍBA": "PB", "PARAIBA": "PB", " PB": "PB",
    "RIO GRANDE DO NORTE": "RN", " RN": "RN",
  };
  for (const [key, uf] of Object.entries(estados)) {
    if (upper.includes(key)) return uf;
  }
  return "";
}

const MESES = [
  { value: "", label: "Todos os meses" },
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export default function Home() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [retryingItems, setRetryingItems] = useState<Set<number>>(new Set());
  const [selectedItem, setSelectedItem] = useState<Licitacao | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "alta" | "media" | "baixa">("all");

  // Chat Neural
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    carregarDados();
    carregarMensagens();

    // Polling do chat a cada 5 segundos
    const chatInterval = setInterval(carregarMensagens, 5000);
    return () => clearInterval(chatInterval);
  }, []);

  async function carregarMensagens() {
    try {
      const msgs = await buscarMensagens();
      setMessages(msgs);
    } catch (e) {
      console.error("Erro chat:", e);
    }
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      await enviarMensagem("Marcus Fernando", chatInput);
      setChatInput("");
      carregarMensagens();
    } catch (err) {
      alert("Erro ao enviar mensagem.");
    }
  }

  async function handleApproveMessage(id: number, status: "approved" | "rejected") {
    try {
      await aprovarMensagem(id, status);
      // Feedback imediato pessimista (recarrega as msgs para evitar dessincronia)
      carregarMensagens();
    } catch (err) {
      alert("Erro ao atualizar status.");
    }
  }

  async function carregarDados() {
    setLoading(true);
    try {
      const dados = await buscarLicitacoes();
      setLicitacoes(dados);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
    } catch (erro) {
      console.error("Erro ao buscar:", erro);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Tem certeza que deseja apagar este item?")) return;
    try {
      await deleteLicitacao(id);
      setLicitacoes(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      alert("Erro ao excluir: " + e);
    }
  }

  async function handleRetry(id: number) {
    setRetryingItems(prev => new Set(prev).add(id));
    try {
      const res = await retryLicitacao(id);
      setLicitacoes(prev => prev.map(item =>
        item.id === id ? { ...item, ...res.data } : item
      ));
    } catch (e) {
      alert("Erro ao reanalisar: " + e);
    } finally {
      setRetryingItems(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleRodarRobo() {
    setProcessing(true);
    try {
      const res = await rodarRobo();
      const jobId = res.job_id;

      const intervalId = setInterval(async () => {
        try {
          const { checkJobStatus } = require("./api");
          const statusRes = await checkJobStatus(jobId);

          if (statusRes.status === "complete") {
            clearInterval(intervalId);
            setProcessing(false);
            carregarDados();
            alert(`✅ Busca concluída!\nResultado: ${statusRes.result || "Sucesso"}`);
          } else if (statusRes.status === "error" || statusRes.status === "not_found") {
            clearInterval(intervalId);
            setProcessing(false);
            alert("❌ Erro na busca.");
          }
        } catch (err) {
          console.error(err);
        }
      }, 2000);

    } catch (e) {
      alert("Erro ao iniciar robô: " + e);
      setProcessing(false);
    }
  }

  // Filtragem
  const filteredLicitacoes = useMemo(() => {
    let result = licitacoes;

    // Busca textual
    // Busca textual com ordenação por relevância
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      // 1. Filtra
      result = result.filter(l =>
        fuzzyMatch(l.titulo, q) ||
        fuzzyMatch(l.orgao, q) ||
        fuzzyMatch(l.descricao, q) ||
        fuzzyMatch(l.resumo_ia, q)
      );

      // 2. Ordena por relevância (score)
      result.sort((a, b) => {
        const scoreA = getMatchScore(a, searchQuery);
        const scoreB = getMatchScore(b, searchQuery);
        return scoreB - scoreA; // Decrescente
      });
    }

    // Filtro por mês
    if (filterMonth) {
      result = result.filter(l => {
        if (!l.data_abertura) return false;
        return l.data_abertura.includes(`/${filterMonth}/`) || l.data_abertura.startsWith(`${filterMonth}/`);
      });
    }

    // Filtro por status
    if (filterStatus === "alta") result = result.filter(l => l.score_interesse >= 70);
    else if (filterStatus === "media") result = result.filter(l => l.score_interesse >= 40 && l.score_interesse < 70);
    else if (filterStatus === "baixa") result = result.filter(l => l.score_interesse < 40);

    return result;
  }, [licitacoes, searchQuery, filterMonth, filterStatus]);

  // Estatísticas
  const total = licitacoes.length;
  const altaRelevancia = licitacoes.filter(l => l.score_interesse >= 70).length;
  const emAnalise = licitacoes.filter(l => l.score_interesse >= 40 && l.score_interesse < 70).length;
  const descartadas = licitacoes.filter(l => l.score_interesse < 40).length;

  return (
    <div className="flex min-h-screen font-sans bg-[#0d1117] text-[#e6edf3]">

      {/* Sidebar */}
      <aside className="w-16 md:w-64 border-r border-[#30363d] flex-shrink-0 flex flex-col bg-[#010409]">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-[#30363d]">
          <Icons.Chart className="text-[#2f81f7] w-6 h-6" />
          <span className="ml-3 font-bold text-lg hidden md:block tracking-tighter">BH.LICIT<span className="text-[#2f81f7]">_v2</span></span>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 bg-[#21262d] border-l-2 border-[#2f81f7] text-white text-sm font-medium cursor-pointer">
            <Icons.Search className="w-4 h-4" />
            <span className="hidden md:block">Monitoramento</span>
          </div>
          <Link href="/leitor-edital" className="flex items-center gap-3 px-3 py-2 text-[#7d8590] hover:text-[#e6edf3] hover:bg-[#161b22] transition-colors text-sm font-medium cursor-pointer">
            <Icons.Robot className="w-4 h-4" />
            <span className="hidden md:block">Leitor de Editais</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-[#30363d] text-[10px] text-[#7d8590] hidden md:block font-mono text-center">
          Sistema Ativo · {total} licitações
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="h-16 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between px-6">
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-[#e6edf3] tracking-wide uppercase">Painel de Monitoramento</h2>
            <span className="text-xs text-[#7d8590]">Atualizado: {lastUpdate || "Aguardando..."}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={carregarDados}
              className="p-2 text-[#7d8590] hover:text-[#2f81f7] border border-[#30363d] hover:border-[#2f81f7] bg-[#21262d] transition-all rounded"
              title="Atualizar dados"
            >
              <Icons.Refresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleRodarRobo}
              disabled={processing}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all rounded
                ${processing
                  ? "bg-[#21262d] border-[#30363d] text-[#7d8590] cursor-wait"
                  : "bg-[#1f6feb] border-[#1f6feb] text-white hover:bg-[#238636] hover:border-[#238636]"}`}
            >
              <Icons.Robot className="w-3 h-3" />
              {processing ? "⏳ Buscando..." : "🔍 Buscar Licitações"}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-[#0d1117]">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard title="Total" value={total} borderColor="border-[#30363d]" textColor="text-white" />
            <KpiCard title="Alta Prioridade" value={altaRelevancia} borderColor="border-[#238636]" textColor="text-[#3fb950]" />
            <KpiCard title="Em Análise" value={emAnalise} borderColor="border-[#d29922]" textColor="text-[#d29922]" />
            <KpiCard title="Descartadas" value={descartadas} borderColor="border-[#da3633]" textColor="text-[#f85149]" />
          </div>

          {/* Search & Filter Bar */}
          <div className="mb-4 flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" />
              <input
                type="text"
                placeholder="Buscar por título, órgão ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#010409] border border-[#30363d] text-[#e6edf3] text-sm px-10 py-2.5 rounded focus:outline-none focus:border-[#2f81f7] placeholder-[#484f58] transition-colors"
              />
            </div>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-[#010409] border border-[#30363d] text-[#e6edf3] text-sm px-3 py-2.5 rounded focus:outline-none focus:border-[#2f81f7] cursor-pointer"
            >
              {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <div className="flex gap-1">
              {(["all", "alta", "media", "baixa"] as const).map((s) => {
                const labels = { all: "Todas", alta: "Alta", media: "Média", baixa: "Baixa" };
                const colors = { all: "border-[#30363d] text-[#7d8590]", alta: "border-[#238636] text-[#3fb950]", media: "border-[#d29922] text-[#d29922]", baixa: "border-[#da3633] text-[#f85149]" };
                return (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-2 text-xs font-medium border rounded transition-all
                      ${filterStatus === s ? `${colors[s]} bg-[#21262d]` : "border-[#21262d] text-[#484f58] hover:text-[#7d8590]"}`}
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data Grid */}
          <div className="border border-[#30363d] bg-[#010409] rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-[#30363d] bg-[#161b22] flex justify-between items-center">
              <span className="text-xs text-[#7d8590]">Licitações Encontradas · <strong className="text-[#e6edf3]">{filteredLicitacoes.length}</strong> resultados</span>
              <div className="flex gap-2 items-center">
                <div className="w-2 h-2 rounded-full bg-[#238636] animate-pulse"></div>
                <span className="text-[10px] uppercase text-[#238636] font-bold">Online</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#30363d] text-[#7d8590] text-[11px] uppercase tracking-wider bg-[#0d1117]">
                    <th className="px-5 py-3 w-28">Situação</th>
                    <th className="px-5 py-3">Licitação</th>
                    <th className="px-5 py-3 w-[35%]">Resumo da IA</th>
                    <th className="px-5 py-3 text-center w-20">Nota</th>
                    <th className="px-5 py-3 text-right w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d] text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-[#7d8590]">
                        <Icons.Refresh className="animate-spin w-6 h-6 mx-auto mb-2 opacity-50" />
                        Carregando licitações...
                      </td>
                    </tr>
                  ) : filteredLicitacoes.map((item) => {
                    const uf = extrairUF(item.orgao);
                    return (
                      <tr key={item.id} className="hover:bg-[#161b22] group transition-colors cursor-pointer" onClick={() => setSelectedItem(item)}>
                        <td className="px-5 py-4 align-top">
                          <StatusBadge score={item.score_interesse} risco={item.risco} />
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="text-[#e6edf3] font-semibold mb-1.5 leading-snug group-hover:text-[#58a6ff] transition-colors">
                            {item.titulo}
                          </div>
                          <div className="flex items-center gap-2 text-[#7d8590] text-xs">
                            <span>🏛️ {item.orgao || "Portal Gov"}</span>
                            {uf && (
                              <span className="bg-[#21262d] text-[#58a6ff] text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {uf}
                              </span>
                            )}
                            <span className="text-[#30363d]">·</span>
                            <span className="text-[#484f58]">#{item.id}</span>
                          </div>
                          {item.risco && item.risco !== "Nenhum" && item.risco !== "Nenhum (Upload Manual)" && item.score_interesse < 50 && (
                            <div className="mt-1.5 text-[#f85149] text-[11px] border border-[#da3633]/40 px-2 py-0.5 inline-block bg-[#da3633]/10 rounded">
                              ⚠ {item.risco}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="text-[#8b949e] text-sm leading-relaxed">
                            {retryingItems.has(item.id) ? (
                              <span className="text-[#2f81f7] animate-pulse">Analisando...</span>
                            ) : (
                              item.resumo_ia || item.descricao
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-center">
                          <ScoreCircle value={item.score_interesse} />
                        </td>
                        <td className="px-5 py-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleRetry(item.id)}
                              disabled={retryingItems.has(item.id)}
                              className="p-1.5 text-[#7d8590] hover:text-[#d29922] hover:bg-[#d29922]/10 rounded transition-all"
                              title="Reanalisar"
                            >
                              <Icons.Refresh className={`w-4 h-4 ${retryingItems.has(item.id) ? "animate-spin" : ""}`} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-[#7d8590] hover:text-[#f85149] hover:bg-[#f85149]/10 rounded transition-all"
                              title="Excluir"
                            >
                              <Icons.Trash className="w-4 h-4" />
                            </button>
                            <a
                              href={item.link_edital}
                              target="_blank"
                              className="p-1.5 text-[#58a6ff] hover:text-white hover:bg-[#2f81f7]/10 rounded transition-all"
                              title="Abrir edital"
                            >
                              <Icons.Check className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {!loading && filteredLicitacoes.length === 0 && (
                <div className="p-10 text-center text-[#7d8590]">
                  {searchQuery || filterMonth || filterStatus !== "all"
                    ? "Nenhum resultado encontrado para os filtros selecionados."
                    : "Nenhuma licitação encontrada. Clique em \"Buscar Licitações\" para iniciar."}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 border-b border-[#30363d]">
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge score={selectedItem.score_interesse} risco={selectedItem.risco} />
                  <ScoreCircle value={selectedItem.score_interesse} />
                  {extrairUF(selectedItem.orgao) && (
                    <span className="bg-[#21262d] text-[#58a6ff] text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {extrairUF(selectedItem.orgao)}
                    </span>
                  )}
                </div>
                <h3 className="text-[#e6edf3] font-bold text-sm leading-snug">{selectedItem.titulo}</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-[#7d8590] hover:text-[#e6edf3] transition-colors text-xl leading-none p-1">✕</button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-[#7d8590] uppercase tracking-wider">Órgão</label>
                  <p className="text-[#e6edf3] mt-1 font-medium">{selectedItem.orgao || '—'}</p>
                </div>
                <div>
                  <label className="text-[10px] text-[#7d8590] uppercase tracking-wider">ID</label>
                  <p className="text-[#e6edf3] mt-1">#{selectedItem.id}</p>
                </div>
                <div>
                  <label className="text-[10px] text-[#7d8590] uppercase tracking-wider">Data de Abertura</label>
                  <p className="text-[#e6edf3] mt-1">{selectedItem.data_abertura || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-[10px] text-[#7d8590] uppercase tracking-wider">Valor Estimado</label>
                  <p className="text-[#3fb950] mt-1 font-bold text-base">{selectedItem.valor_estimado && selectedItem.valor_estimado !== 'None' ? `R$ ${selectedItem.valor_estimado}` : 'Não informado'}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#7d8590] uppercase tracking-wider">Risco</label>
                <p className={`mt-1 ${selectedItem.risco && selectedItem.risco !== 'Nenhum' && selectedItem.risco !== 'Nenhum (Upload Manual)' ? 'text-[#f85149]' : 'text-[#3fb950]'}`}>{selectedItem.risco || 'Nenhum'}</p>
              </div>

              <div>
                <label className="text-[10px] text-[#7d8590] uppercase tracking-wider">Descrição / Objeto</label>
                <p className="text-[#8b949e] mt-1 leading-relaxed bg-[#010409] p-3 border border-[#21262d] rounded">{selectedItem.descricao || '—'}</p>
              </div>

              <div>
                <label className="text-[10px] text-[#7d8590] uppercase tracking-wider">Resumo da IA</label>
                <p className="text-[#e6edf3] mt-1 leading-relaxed bg-[#010409] p-3 border border-[#21262d] rounded">{selectedItem.resumo_ia || 'Ainda não analisado'}</p>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex gap-3 pt-3 border-t border-[#21262d]">
                {selectedItem.link_edital && !selectedItem.link_edital.startsWith('upload://') && (
                  <a href={selectedItem.link_edital} target="_blank" className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#2f81f7] text-[#58a6ff] hover:bg-[#2f81f7]/20 transition-all rounded">
                    Abrir Edital →
                  </a>
                )}
                <button
                  onClick={() => { handleRetry(selectedItem.id); setSelectedItem(null); }}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#d29922] text-[#d29922] hover:bg-[#d29922]/20 transition-all rounded"
                >
                  🔄 Reanalisar
                </button>
                <button
                  onClick={() => { handleDelete(selectedItem.id); setSelectedItem(null); }}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#f85149] text-[#f85149] hover:bg-[#f85149]/20 transition-all ml-auto rounded"
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHAT NEURAL FLUTUANTE */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        {chatOpen && (
          <div className="bg-[#0d1117] border border-[#30363d] rounded-t-lg shadow-2xl w-80 mb-0 overflow-hidden flex flex-col h-96">
            <div className="px-4 py-3 bg-[#161b22] border-b border-[#30363d] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse"></div>
                <h3 className="text-[#e6edf3] font-bold text-sm">Mente Coletiva V3</h3>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-[#7d8590] hover:text-[#e6edf3]">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
              {messages.length === 0 ? (
                <p className="text-center text-[#7d8590] text-xs pt-10">Nenhuma mensagem ainda.</p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender === "Marcus Fernando";
                  return (
                    <div key={msg.id} className={`flex flex-col w-full ${isMine ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-[#7d8590] mb-0.5 px-1">{msg.sender} • {msg.created_at?.split(" ")[1]?.slice(0, 5)}</span>
                      <div className={`px-4 py-3 rounded-xl text-sm w-[90%] md:w-[85%] break-words shadow-sm ${isMine ? 'bg-[#2f81f7] text-white rounded-tr-sm' : 'bg-[#161b22] text-[#e6edf3] rounded-tl-sm border border-[#30363d]'}`}>
                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-snug prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-[#30363d]">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>

                        {/* Approval UI */}
                        {msg.requires_approval && (
                          <div className="mt-3 pt-3 border-t border-[#30363d]/50 flex gap-2">
                            {msg.approval_status === "pending" ? (
                              <>
                                <button onClick={() => handleApproveMessage(msg.id, "approved")} className="flex-1 py-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] font-bold rounded cursor-pointer transition-colors shadow">✅ APROVAR</button>
                                <button onClick={() => handleApproveMessage(msg.id, "rejected")} className="flex-1 py-1.5 bg-[#da3633] hover:bg-[#f85149] text-white text-[11px] font-bold rounded cursor-pointer transition-colors shadow">❌ REJEITAR</button>
                              </>
                            ) : (
                              <div className="flex-1 text-center py-1 rounded bg-[#010409]">
                                <span className={`text-[10px] uppercase font-bold tracking-widest ${msg.approval_status === "approved" ? "text-[#3fb950]" : "text-[#f85149]"}`}>
                                  {msg.approval_status === "approved" ? "✓ APROVADO" : "✕ REJEITADO"}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendChat} className="border-t border-[#30363d] p-3 flex gap-2 bg-[#0d1117]">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Enviar mensagem..."
                className="flex-1 bg-[#010409] border border-[#30363d] text-[#e6edf3] text-sm px-3 py-1.5 rounded focus:outline-none focus:border-[#2f81f7]"
              />
              <button type="submit" className="bg-[#2f81f7] text-white px-3 py-1.5 rounded hover:bg-[#1f6feb] transition-colors">
                <Icons.Check className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`flex items-center gap-2 px-5 py-3 rounded-full shadow-lg font-bold text-sm transition-all shadow-[#2f81f7]/20
            ${chatOpen ? 'bg-[#21262d] text-[#e6edf3] border border-[#30363d]' : 'bg-[#2f81f7] text-white hover:bg-[#1f6feb] hover:scale-105'}`}
        >
          <Icons.Robot className="w-5 h-5" />
          {chatOpen ? 'Fechar Chat' : 'Chat Neural V3'}
        </button>
      </div>

    </div>
  );
}

// Subcomponents
function KpiCard({ title, value, borderColor, textColor }: { title: string, value: number, borderColor: string, textColor: string }) {
  return (
    <div className={`p-4 bg-[#010409] border ${borderColor} rounded-lg flex flex-col items-start justify-center`}>
      <span className="text-[10px] uppercase text-[#7d8590] mb-1 tracking-widest">{title}</span>
      <span className={`text-3xl font-bold ${textColor} tracking-tighter`}>{value}</span>
    </div>
  );
}

function StatusBadge({ score, risco }: { score: number, risco: string }) {
  if (score >= 70) return <span className="bg-[#238636] text-white text-[10px] font-bold px-2.5 py-1 rounded tracking-wide">Alta</span>;
  if (score >= 40) return <span className="bg-[#d29922] text-[#0d1117] text-[10px] font-bold px-2.5 py-1 rounded tracking-wide">Média</span>;
  return <span className="bg-[#30363d] text-[#8b949e] text-[10px] font-bold px-2.5 py-1 rounded tracking-wide">Baixa</span>;
}

function ScoreCircle({ value }: { value: number }) {
  let colorClass = "text-[#7d8590]";
  if (value >= 70) colorClass = "text-[#3fb950]";
  else if (value >= 40) colorClass = "text-[#d29922]";
  else colorClass = "text-[#f85149]";

  return (
    <div className={`text-lg font-bold ${colorClass}`}>
      {value}<span className="text-[10px] opacity-50">%</span>
    </div>
  );
}