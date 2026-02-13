"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProposalModal } from '@/components/ProposalModal';
import { ArrowRight, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, FileText } from "lucide-react";

interface Licitacao {
  id: number;
  titulo: string;
  orgao_nome: string;
  estado_sigla: string;
  data_publicacao: string;
  link_edital: string;
  status: string;
  rejection_reason?: string;
  priority?: string;
  score?: number;
  // AI Analysis Data
  analysis?: {
    resumo: string;
    potencial: string;
    risco: string;
    tags: string[];
  };
  isAnalyzing?: boolean;
}

interface LicitacaoResponse {
  items: Licitacao[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function Home() {
  /* State Definitions */
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ novos: 0, analise: 0, aprovados: 0 });
  const [currentFilter, setCurrentFilter] = useState<'importantes' | 'todos' | 'rejeitados' | 'aprovados'>('importantes');
  const [syncDays, setSyncDays] = useState(3); // Moved up

  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset page on new search
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Include days parameter in URL
      let url = `http://127.0.0.1:8000/api/licitacoes?page=${page}&limit=20&days=${syncDays}`;

      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }

      // Filter Logic (Passed to Backend)
      if (currentFilter === 'importantes') {
        url += '&priority=alta';
      } else if (currentFilter === 'rejeitados') {
        url += '&status=rejeitado';
      } else if (currentFilter === 'aprovados') {
        url += '&status=aprovado';
      } else {
        // 'todos' (Backend default: !rejeitado)
      }

      const res = await fetch(url);
      if (res.ok) {
        const data: LicitacaoResponse = await res.json();

        setLicitacoes(data.items || []);
        setTotalPages(data.pages);
        setTotalItems(data.total);
      }
    } catch (error) {
      console.error("Erro ao buscar licitações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter: 'importantes' | 'todos' | 'rejeitados' | 'aprovados') => {
    setCurrentFilter(filter);
  };

  useEffect(() => {
    fetchData();
  }, [page, currentFilter, syncDays, debouncedSearch]); // Added syncDays dependency

  // Sync State removed from here (moved up)

  const handleSync = async () => {
    try {
      setLoading(true);
      await fetch(`http://127.0.0.1:8000/api/sync?days=${syncDays}`, { method: "POST" });
      setPage(1);
      await fetchData();
    } catch (error) {
      alert("Erro ao sincronizar");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string, reason?: string) => {
    try {
      const url = `http://127.0.0.1:8000/api/licitacoes/${id}/status?status=${newStatus}${reason ? `&rejection_reason=${encodeURIComponent(reason)}` : ''}`;
      await fetch(url, { method: "PATCH" });
      fetchData(); // Refresh to update UI
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status");
    }
  };

  const [selectedLicitacao, setSelectedLicitacao] = useState<{ id: number, titulo: string } | null>(null);
  const [isProposalOpen, setIsProposalOpen] = useState(false);

  const handleOpenProposal = (item: Licitacao) => {
    setSelectedLicitacao({ num: item.id, titulo: item.titulo }); // using item.id as num for simplicity or check type
    setIsProposalOpen(true);
  };

  const handleAnalyze = async (id: number) => {
    // 1. Toggle visibility if already exists
    const item = licitacoes.find(i => i.id === id);
    if (item?.analysis) {
      setLicitacoes(prev => prev.map(i => i.id === id ? { ...i, analysis: undefined } : i));
      return;
    }

    // 2. Fetch Analysis
    try {
      setLicitacoes(prev => prev.map(i => i.id === id ? { ...i, isAnalyzing: true } : i));

      const res = await fetch(`http://127.0.0.1:8000/api/licitacoes/${id}/analyze`, { method: "POST" });
      const data = await res.json();

      setLicitacoes(prev => prev.map(i => i.id === id ? { ...i, isAnalyzing: false, analysis: data } : i));
    } catch (error) {
      console.error("Erro na análise:", error);
      alert("Erro ao analisar com IA");
      setLicitacoes(prev => prev.map(i => i.id === id ? { ...i, isAnalyzing: false } : i));
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans p-8">
      <header className="mb-8 flex justify-between items-center bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-100">Brasilhosp Licitações</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Monitoramento de Oportunidades: <span className="font-semibold text-zinc-700 dark:text-zinc-300">MA, PI, PA</span>
          </p>
        </div>
        <div className="flex items-center gap-6">
          {/* Search Bar */}
          <div className="relative mr-4">
            <input
              type="text"
              placeholder="🔍 Buscar por objeto, cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-64 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:w-80"
            />
          </div>

          <div className="text-right">
            <p className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">Total Encontrado</p>
            <p className="text-2xl font-bold text-blue-600">{totalItems}</p>
          </div>
          <div className="h-10 w-px bg-zinc-200 dark:bg-zinc-700"></div>

          <div className="flex items-center gap-2">
            <select
              value={syncDays}
              onChange={(e) => setSyncDays(Number(e.target.value))}
              disabled={loading}
              className="h-10 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium px-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value={3}>Últimos 3 dias</option>
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
            </select>

            <button
              onClick={handleSync}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg font-medium h-10"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Sincronizando..." : "Atualizar Radar"}
            </button>
          </div>
        </div>
      </header>

      {/* Pagination Top */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          📋 Lista de Oportunidades
          {loading && <span className="text-sm font-normal text-zinc-400 animate-pulse">Carregando dados...</span>}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 text-sm font-semibold transition-colors text-zinc-700 dark:text-zinc-300"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="flex items-center px-4 py-2 text-sm font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
            Página {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 text-sm font-semibold transition-colors text-zinc-700 dark:text-zinc-300"
          >
            Próximo <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-1">
        <button
          onClick={() => { setPage(1); handleFilterChange('importantes'); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${currentFilter === 'importantes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
        >
          🔥 Alta Relevância
        </button>
        <button
          onClick={() => { setPage(1); handleFilterChange('todos'); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${currentFilter === 'todos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
        >
          📋 Todos
        </button>
        <button
          onClick={() => { setPage(1); handleFilterChange('aprovados'); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${currentFilter === 'aprovados' ? 'border-green-600 text-green-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
        >
          ✅ Aprovados
        </button>
        <button
          onClick={() => { setPage(1); handleFilterChange('rejeitados'); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${currentFilter === 'rejeitados' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
        >
          🗑️ Rejeitados
        </button>
      </div>

      <div className="space-y-4">
        {licitacoes.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent shadow-none">
            <CardContent className="p-12">
              <div className="text-center text-zinc-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
                <p className="text-lg font-medium">{loading ? "Buscando itens..." : "Nenhum item encontrado nesta categoria."}</p>
                <p className="text-sm mt-2">Tente mudar o filtro ou atualizar o radar.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {licitacoes.map((item) => (
              <Card key={item.id} className={`overflow-hidden transition-all duration-200 border-l-4 ${item.status === 'aprovado' ? 'border-l-green-500 bg-green-50/10 dark:bg-green-900/10' :
                item.status === 'rejeitado' ? 'border-l-red-500 bg-red-50/10 dark:bg-red-900/10 opacity-75 hover:opacity-100' :
                  item.priority === 'alta' ? 'border-l-yellow-400 bg-yellow-50/20 dark:bg-yellow-900/10' : // Corrected border-l-blue-500 to border-l-yellow-400
                    'border-l-blue-500 bg-white dark:bg-zinc-900'
                } hover:shadow-md`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="space-y-3 w-full">
                      {/* Header Badge Row */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {item.priority === 'alta' && item.status !== 'rejeitado' && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-yellow-100 text-yellow-800 text-xs font-bold border border-yellow-200">
                            ⭐ Alta Relevância ({item.score}%)
                          </span>
                        )}
                        {item.priority === 'media' && item.status !== 'rejeitado' && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                            🔹 Média ({item.score}%)
                          </span>
                        )}

                        <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase tracking-wide">
                          {item.estado_sigla}
                        </span>
                        <span className="text-xs text-zinc-500 flex items-center gap-1 bg-white dark:bg-zinc-950 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 shadow-sm">
                          📅 {new Date(item.data_publicacao).toLocaleDateString()}
                        </span>
                        {item.status === 'rejeitado' && (
                          <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded font-bold flex items-center gap-1">
                            🚫 Rejeitado: {item.rejection_reason || 'Filtro Automático'}
                          </span>
                        )}
                        {item.status === 'aprovado' && (
                          <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded font-bold flex items-center gap-1">
                            ✅ Aprovado
                          </span>
                        )}
                        {/* Removed 'recebido' status badge as it's now covered by priority */}
                      </div>

                      {/* Main Content */}
                      <div>
                        <h3 className="font-bold text-lg leading-snug text-zinc-900 dark:text-zinc-100 mb-1">
                          {item.titulo}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium my-2">
                          <span>🏢 {item.orgao_nome}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex flex-col gap-2 shrink-0 self-start mt-1">
                      <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        {item.status !== 'aprovado' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(item.id, 'aprovado'); }}
                            className="px-3 py-1.5 text-xs font-bold text-green-700 bg-white border border-green-200 hover:bg-green-50 rounded-md transition-colors shadow-sm uppercase tracking-wide"
                          >
                            Aprovar
                          </button>
                        )}

                        {item.status !== 'rejeitado' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(item.id, 'rejeitado', 'Manual'); }}
                            className="px-3 py-1.5 text-xs font-bold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-md transition-colors shadow-sm uppercase tracking-wide"
                          >
                            Rejeitar
                          </button>
                        )}

                        <button
                          onClick={(e) => { e.stopPropagation(); handleAnalyze(item.id); }}
                          disabled={item.isAnalyzing}
                          className={`px-3 py-1.5 text-xs font-bold border rounded-md transition-colors shadow-sm uppercase tracking-wide flex items-center gap-2 ${item.analysis
                            ? "text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100"
                            : "text-zinc-700 bg-white border-zinc-200 hover:bg-zinc-50"
                            }`}
                        >
                          {item.isAnalyzing ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" /> Analisando...
                            </>
                          ) : item.analysis ? (
                            <>🤖 Fechar Análise</>
                          ) : (
                            <>🤖 IA Analisar</>
                          )}
                        </button>

                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenProposal(item); }}
                          className="p-2 rounded-md hover:bg-white text-zinc-400 hover:text-blue-600 transition-all border border-transparent hover:border-zinc-200 hover:shadow-sm"
                          title="Gerar Proposta"
                        >
                          <FileText className="w-5 h-5" />
                        </button>

                        <a
                          href={item.link_edital}
                          target="_blank"
                          className="p-2 rounded-md hover:bg-white text-zinc-400 hover:text-blue-600 transition-all border border-transparent hover:border-zinc-200 hover:shadow-sm"
                          title="Ver no PNCP"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis Result Section */}
                  {item.analysis && (
                    <div className="mt-4 p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800 animate-in slide-in-from-top-2 fade-in duration-300">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full text-purple-600 shrink-0">
                          <span className="text-xl">🤖</span>
                        </div>
                        <div className="space-y-3 w-full">
                          <div>
                            <h4 className="text-sm font-bold text-purple-900 dark:text-purple-100 uppercase tracking-wide mb-1">Resumo Executivo</h4>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{item.analysis.resumo}</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1">Potencial</h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.analysis.potencial === 'Alto' ? 'bg-green-100 text-green-800 border-green-200' :
                                item.analysis.potencial === 'Médio' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  'bg-zinc-100 text-zinc-800 border-zinc-200'
                                }`}>
                                {item.analysis.potencial}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1">Riscos Identificados</h4>
                              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30">
                                {item.analysis.risco}
                              </p>
                            </div>
                          </div>

                          {item.analysis.tags && item.analysis.tags.length > 0 && (
                            <div className="flex gap-2 flex-wrap pt-2">
                              {item.analysis.tags.map(tag => (
                                <span key={tag} className="px-2 py-1 text-[10px] uppercase font-bold text-purple-600 bg-purple-100 border border-purple-200 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedLicitacao && (
        <ProposalModal
          isOpen={isProposalOpen}
          onClose={() => setIsProposalOpen(false)}
          licitacaoId={selectedLicitacao.num}
          licitacaoTitulo={selectedLicitacao.titulo}
        />
      )}

      <div className="flex justify-center items-center mt-12 mb-8">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-l-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <span className="px-6 py-3 text-sm font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 border-y border-zinc-300 dark:border-zinc-700">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-r-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 text-sm font-semibold"
        >
          Próximo <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div >
  );
}
