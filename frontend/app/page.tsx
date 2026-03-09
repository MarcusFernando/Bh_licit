"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ProposalModal } from '@/components/ProposalModal';
import { LicitacaoDetailModal } from '@/components/LicitacaoDetailModal';
import { NeuralChat } from '@/components/NeuralChat';
import { PipelineKanban } from '@/components/PipelineKanban';
import { DashboardView } from '@/components/DashboardView';
import { ArrowRight, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, FileText, LayoutDashboard, Kanban, List } from "lucide-react";

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
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<'importantes' | 'todos' | 'rejeitados' | 'aprovados'>('importantes');
  const [currentView, setCurrentView] = useState<'radar' | 'kanban' | 'estratégico'>('radar');
  const [syncDays, setSyncDays] = useState(3);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLicitacao, setSelectedLicitacao] = useState<{ id: number, titulo: string } | null>(null);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let url = `http://127.0.0.1:8000/api/licitacoes?page=${page}&limit=20&days=${syncDays}`;
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (currentFilter === 'importantes') url += '&priority=alta';
      else if (currentFilter === 'rejeitados') url += '&status=rejeitado';
      else if (currentFilter === 'aprovados') url += '&status=aprovado';

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

  useEffect(() => {
    fetchData();
  }, [page, currentFilter, syncDays, debouncedSearch]);

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
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleOpenProposal = (item: Licitacao) => {
    setSelectedLicitacao(item);
    setIsProposalOpen(true);
  };

  const handleOpenDetail = (item: Licitacao) => {
    setSelectedLicitacao(item);
    setIsDetailOpen(true);
  };

  const handleAnalyze = async (id: number) => {
    const item = licitacoes.find(i => i.id === id);
    if (item?.analysis) {
      setLicitacoes(prev => prev.map(i => i.id === id ? { ...i, analysis: undefined } : i));
      return;
    }
    try {
      setLicitacoes(prev => prev.map(i => i.id === id ? { ...i, isAnalyzing: true } : i));
      const res = await fetch(`http://127.0.0.1:8000/api/licitacoes/${id}/analyze`, { method: "POST" });
      const data = await res.json();
      setLicitacoes(prev => prev.map(i => i.id === id ? { ...i, isAnalyzing: false, analysis: data } : i));
    } catch (error) {
      console.error("Erro na análise:", error);
      setLicitacoes(prev => prev.map(i => i.id === id ? { ...i, isAnalyzing: false } : i));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans p-8">
      <header className="mb-8 flex flex-row flex-wrap items-center justify-between gap-6 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        {/* Logo */}
        <div className="shrink-0">
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'white' }}>Brasilhosp Licitações</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Monitoramento: <span className="font-bold text-zinc-300">MA, PI, PA</span>
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex bg-zinc-800 p-1.5 rounded-xl border border-zinc-700 shrink-0 shadow-inner">
          <button onClick={() => setCurrentView('radar')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${currentView === 'radar' ? 'bg-zinc-700 text-blue-400 shadow-md scale-[1.02]' : 'text-zinc-400 hover:text-zinc-200'}`}>
            <List className="w-4 h-4" /> Radar
          </button>
          <button onClick={() => setCurrentView('kanban')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${currentView === 'kanban' ? 'bg-zinc-700 text-blue-400 shadow-md scale-[1.02]' : 'text-zinc-400 hover:text-zinc-200'}`}>
            <Kanban className="w-4 h-4" /> Kanban
          </button>
          <button onClick={() => setCurrentView('estratégico')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${currentView === 'estratégico' ? 'bg-zinc-700 text-blue-400 shadow-md scale-[1.02]' : 'text-zinc-400 hover:text-zinc-200'}`}>
            <LayoutDashboard className="w-4 h-4" /> Estratégico
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4 shrink-0 flex-wrap">
          <div className="relative">
            <input type="text" placeholder="🔍 Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 w-64 rounded-lg border border-zinc-700 bg-zinc-800 text-sm px-4 text-zinc-200 placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:w-72" />
          </div>
          <div className="text-right px-2">
            <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Total</p>
            <p className="text-2xl font-black text-blue-400 leading-none mt-1">{totalItems}</p>
          </div>
          <div className="h-10 w-px bg-zinc-700"></div>
          <div className="flex items-center gap-3">
            <select value={syncDays} onChange={(e) => setSyncDays(Number(e.target.value))} disabled={loading} className="h-11 rounded-lg border border-zinc-700 bg-zinc-800 text-sm font-medium px-3 text-zinc-200 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
              <option value={3}>3 dias</option>
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
            </select>
            <button onClick={handleSync} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 transition-all font-bold text-sm h-11 whitespace-nowrap active:scale-95">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Sincronizando...' : 'Atualizar Radar'}
            </button>
          </div>
        </div>
      </header>

      {currentView === 'radar' && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📋 Lista de Oportunidades
              {loading && <span className="text-sm font-normal text-zinc-400 animate-pulse">Carregando dados...</span>}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 text-base font-bold transition-all text-zinc-700 dark:text-zinc-300 shadow-sm active:scale-95"><ChevronLeft className="w-5 h-5" /> Anterior</button>
              <span className="flex items-center px-6 py-2.5 text-base font-black text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm min-w-[120px] justify-center">Página {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 text-base font-bold transition-all text-zinc-700 dark:text-zinc-300 shadow-sm active:scale-95">Próximo <ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-1">
            <button onClick={() => { setPage(1); setCurrentFilter('importantes'); }} className={`px-6 py-3 text-base font-bold border-b-2 transition-all ${currentFilter === 'importantes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>🔥 Alta Relevância</button>
            <button onClick={() => { setPage(1); setCurrentFilter('todos'); }} className={`px-6 py-3 text-base font-bold border-b-2 transition-all ${currentFilter === 'todos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>📋 Todos</button>
            <button onClick={() => { setPage(1); setCurrentFilter('aprovados'); }} className={`px-6 py-3 text-base font-bold border-b-2 transition-all ${currentFilter === 'aprovados' ? 'border-green-600 text-green-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>✅ Aprovados</button>
            <button onClick={() => { setPage(1); setCurrentFilter('rejeitados'); }} className={`px-6 py-3 text-base font-bold border-b-2 transition-all ${currentFilter === 'rejeitados' ? 'border-red-600 text-red-600' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>🗑️ Rejeitados</button>
          </div>

          <div className="space-y-4">
            {licitacoes.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent shadow-none"><CardContent className="p-12 text-center text-zinc-500"><AlertCircle className="w-12 h-12 mx-auto mb-4 text-zinc-300" /><p className="text-lg font-medium">{loading ? "Buscando itens..." : "Nenhum item encontrado."}</p></CardContent></Card>
            ) : (
              <div className="grid gap-4">
                {licitacoes.map((item) => (
                  <Card key={item.id} className={`overflow-hidden transition-all duration-200 border-l-4 ${item.status === 'aprovado' ? 'border-l-green-500 bg-green-50/10 dark:bg-green-900/10' : item.status === 'rejeitado' ? 'border-l-red-500 bg-red-50/10 dark:bg-red-900/10' : item.priority === 'alta' ? 'border-l-yellow-400 bg-yellow-50/20' : 'border-l-blue-500 bg-white dark:bg-zinc-900'} hover:shadow-md`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="space-y-3 w-full">
                          <div className="flex items-center gap-3 flex-wrap">
                            {item.priority === 'alta' && <span className="px-2.5 py-1 rounded-md bg-yellow-100 text-yellow-800 text-xs font-bold border border-yellow-200">⭐ Alta Relevância ({item.score}%)</span>}
                            <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 tracking-wide uppercase">{item.estado_sigla}</span>
                            <span className="text-xs text-zinc-500 flex items-center gap-1 bg-white dark:bg-zinc-950 px-2 py-1 rounded border border-zinc-200 shadow-sm">📅 {new Date(item.data_publicacao).toLocaleDateString()}</span>
                            {item.status === 'rejeitado' && <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded font-bold">🚫 Rejeitado</span>}
                            {item.status === 'aprovado' && <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded font-bold">✅ Aprovado</span>}
                          </div>
                          <div className="cursor-pointer group/title" onClick={() => handleOpenDetail(item)}>
                            <h3 className="font-bold text-lg leading-snug text-zinc-900 dark:text-zinc-100 mb-1 group-hover/title:text-blue-600 transition-colors">{item.titulo}</h3>
                            <div className="text-sm text-zinc-500 font-medium">🏢 {item.orgao_nome}</div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0 self-start mt-1">
                          <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                            {item.status !== 'aprovado' && <button onClick={() => handleStatusUpdate(item.id, 'aprovado')} className="px-3 py-1.5 text-xs font-bold text-green-700 bg-white border border-green-200 hover:bg-green-50 rounded-md transition-all shadow-sm uppercase tracking-wide">Aprovar</button>}
                            {item.status !== 'rejeitado' && <button onClick={() => handleStatusUpdate(item.id, 'rejeitado', 'Manual')} className="px-3 py-1.5 text-xs font-bold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-md transition-all shadow-sm uppercase tracking-wide">Rejeitar</button>}
                            <button onClick={() => handleAnalyze(item.id)} disabled={item.isAnalyzing} className={`px-3 py-1.5 text-xs font-bold border rounded-md transition-all shadow-sm uppercase tracking-wide flex items-center gap-2 ${item.analysis ? "text-purple-700 bg-purple-50 border-purple-200" : "text-zinc-700 bg-white border-zinc-200"}`}>{item.isAnalyzing ? "Analisando..." : item.analysis ? "🤖 Ver Análise" : "🤖 IA Analisar"}</button>
                            <button onClick={() => handleOpenProposal(item)} className="p-2 rounded-md hover:bg-white text-zinc-400 hover:text-blue-600 transition-all border border-transparent hover:border-zinc-200" title="Gerar Proposta"><FileText className="w-5 h-5" /></button>
                            <a href={item.link_edital} target="_blank" className="p-2 rounded-md hover:bg-white text-zinc-400 hover:text-blue-600 transition-all border border-transparent hover:border-zinc-200" title="Ver no PNCP"><ArrowRight className="w-5 h-5" /></a>
                          </div>
                        </div>
                      </div>
                      {item.analysis && (
                        <div className="mt-4 p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800 animate-in slide-in-from-top-2 fade-in duration-300">
                          <h4 className="text-sm font-bold text-purple-900 dark:text-purple-100 uppercase tracking-wide mb-1">Resumo Executivo</h4>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-3">{item.analysis.resumo}</p>
                          <div className="flex gap-4 mb-3">
                            <div><h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Potencial</h5><span className="text-xs font-bold text-green-600">{item.analysis.potencial}</span></div>
                            <div><h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Risco</h5><span className="text-xs font-bold text-red-600">{item.analysis.risco}</span></div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {item.analysis.tags?.map(tag => <span key={tag} className="px-2 py-0.5 text-[9px] uppercase font-bold text-purple-600 bg-purple-100 border border-purple-200 rounded">#{tag}</span>)}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-center items-center mt-12 mb-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="px-6 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 rounded-l-lg disabled:opacity-50 text-sm font-semibold">Anterior</button>
            <span className="px-6 py-3 text-sm font-bold bg-zinc-50 border-y border-zinc-300">Página {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="px-6 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 rounded-r-lg disabled:opacity-50 text-sm font-semibold">Próximo</button>
          </div>
        </>
      )}

      {currentView === 'kanban' && <PipelineKanban onItemClick={handleOpenDetail} />}
      {currentView === 'estratégico' && <DashboardView />}

      {selectedLicitacao && (
        <ProposalModal
          isOpen={isProposalOpen}
          onClose={() => setIsProposalOpen(false)}
          licitacaoId={selectedLicitacao.id}
          licitacaoTitulo={selectedLicitacao.titulo}
        />
      )}

      {selectedLicitacao && (
        <LicitacaoDetailModal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          licitacao={selectedLicitacao}
        />
      )}

      <NeuralChat />
    </div>
  );
}
