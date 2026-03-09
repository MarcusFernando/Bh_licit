"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProposalModal } from '@/components/ProposalModal';
import { API_URL } from "./api";
import { NeuralChat } from '@/components/NeuralChat';
import { DashboardView } from '@/components/DashboardView';
import { PipelineKanban } from '@/components/PipelineKanban';
import { OpportunityCard } from '@/components/OpportunityCard';
import { ArrowRight, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, FileText, LayoutDashboard, Target, GitMerge } from "lucide-react";

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

  // Tabs State
  const [activeTab, setActiveTab] = useState<'radar' | 'dashboard' | 'pipeline'>('radar');

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Include days parameter in URL
      let url = `${API_URL}/api/licitacoes?page=${page}&limit=20&days=${syncDays}`;

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

      {/* Main Tabs */}
      <div className="flex items-center gap-2 mb-8 bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-xl w-fit border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          <LayoutDashboard className="w-4 h-4" /> Visão Estratégica
        </button>
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'radar' ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          <Target className="w-4 h-4" /> Radar de Vendas
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'pipeline' ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          <GitMerge className="w-4 h-4" /> Pipeline Kanban
        </button>
      </div>

      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'pipeline' && <PipelineKanban />}

      {activeTab === 'radar' && (
        <div className="animate-in fade-in duration-500">
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
                  <OpportunityCard
                    key={item.id}
                    item={item as any}
                    onStatusUpdate={handleStatusUpdate}
                    onAnalyze={handleAnalyze}
                    onOpenProposal={handleOpenProposal as any}
                  />
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
        </div>
      )}

      <NeuralChat />
    </div >
  );
}
