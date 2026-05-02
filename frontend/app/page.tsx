"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ProposalModal } from '@/components/ProposalModal';
import { LicitacaoDetailModal } from '@/components/LicitacaoDetailModal';
import { NeuralChat } from '@/components/NeuralChat';
import { PipelineKanban } from '@/components/PipelineKanban';
import { DashboardView } from '@/components/DashboardView';
import { ArrowRight, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, FileText, LayoutDashboard, Kanban, List, Trash2, Sun, Moon, Compass, Settings, Bell, LogOut, CheckCircle } from "lucide-react";

interface Licitacao {
  id: number;
  pncp_id: string;
  numero: string;
  ano: number;
  titulo: string;
  orgao_nome: string;
  estado_sigla: string;
  cidade?: string;
  data_publicacao: string;
  data_abertura_proposta?: string;
  data_limite_impugnacao?: string;
  data_limite_esclarecimento?: string;
  valor_estimado_total?: number;
  link_edital: string;
  modalidade?: string;
  modo_disputa?: string;
  edital_atualizado?: boolean;
  me_epp_status?: string;
  status: string;
  rejection_reason?: string;
  priority?: string;
  score?: number;
  analysis?: {
    resumo: string;
    potencial: string;
    risco: string;
    tags: string[];
    valor_estimado?: number;
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
  const [currentView, setCurrentView] = useState<'radar' | 'kanban' | 'estratégico'>('estratégico');
  const [syncDays, setSyncDays] = useState(3);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLicitacao, setSelectedLicitacao] = useState<{ id: number, titulo: string } | null>(null);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

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
      // Endpoint /api/sync na V4 (messages.py)
      const res = await fetch(`http://127.0.0.1:8000/api/sync?days=${syncDays}`, { method: "POST" });
      const data = await res.json();
      if (data.status === 'success') {
        alert(`${data.new_items} novas oportunidades encontradas!`);
      }
      setPage(1);
      await fetchData();
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      alert("Erro ao sincronizar com o radar");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string, reason?: string) => {
    try {
      const url = `http://127.0.0.1:8000/api/licitacoes/${id}/status`;
      await fetch(url, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus,
          rejection_reason: reason || null
        })
      });
      fetchData();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleOpenProposal = (item: Licitacao) => {
    setSelectedLicitacao(item);
    setIsProposalOpen(true);
    setIsDetailOpen(false);
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

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente esta licitação?")) return;
    try {
      await fetch(`http://127.0.0.1:8000/api/licitacoes/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar - Lovable Theme */}
      <aside className="w-64 bg-white dark:bg-[#09090b] border-r border-border shrink-0 flex flex-col z-20">
        <div className="h-20 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span className="font-extrabold text-xl tracking-tight text-foreground">Brasilhosp</span>
          </div>
        </div>
        <div className="flex-1 py-8 px-4 space-y-8 overflow-y-auto">
          <div>
            <p className="px-4 text-[11px] font-black uppercase text-muted-foreground tracking-widest mb-4">Navegação Principal</p>
            <nav className="space-y-1.5">
              <button onClick={() => setCurrentView('estratégico')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'estratégico' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted font-medium'}`}>
                <LayoutDashboard className="w-5 h-5" /> Dashboard
              </button>
              <button onClick={() => setCurrentView('radar')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'radar' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted font-medium'}`}>
                <Compass className="w-5 h-5" /> Explorador de Editais
              </button>
              <button onClick={() => setCurrentView('kanban')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'kanban' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted font-medium'}`}>
                <Settings className="w-5 h-5" /> Gerenciamento
              </button>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
        {/* Top Header */}
        <header className="h-20 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md border-b border-border px-8 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-foreground">
              {currentView === 'radar' && 'Radar de Oportunidades'}
              {currentView === 'kanban' && 'Gerenciamento (Pipeline)'}
              {currentView === 'estratégico' && 'Dashboard Central'}
            </h2>
            {currentView === 'radar' && (
              <span className="px-3 py-1 bg-muted text-muted-foreground text-xs font-bold rounded-full">
                Exibindo {totalItems} itens
              </span>
            )}
          </div>
          <div className="flex items-center gap-6">
            {/* Context Controls */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <input type="text" placeholder="🔍 Buscar licitação..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 w-64 rounded-full border border-border bg-white dark:bg-zinc-900 text-sm px-5 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary outline-none transition-all focus:w-72 shadow-sm" />
              </div>
              <button onClick={toggleTheme} className="p-2.5 rounded-full border border-border bg-white dark:bg-zinc-900 text-muted-foreground hover:text-primary transition-all shadow-sm" title="Alternar Tema">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
            <div className="h-8 w-px bg-border"></div>
            {/* User Profile & Actions */}
            <div className="flex items-center gap-4 text-right">
              <button className="relative text-muted-foreground hover:text-foreground transition-all">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-white dark:border-zinc-950"></span>
              </button>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-foreground leading-tight">BrasilHosp</p>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Equipe</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm ring-2 ring-transparent transition-all">
                  BH
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Workspace */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-8">
          {currentView === 'radar' && (
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 bg-white dark:bg-[#09090b] p-1.5 rounded-xl border border-border shadow-sm">
                  <button onClick={() => { setPage(1); setCurrentFilter('importantes'); }} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${currentFilter === 'importantes' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>🔥 Alta Relevância</button>
                  <button onClick={() => { setPage(1); setCurrentFilter('todos'); }} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${currentFilter === 'todos' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>📋 Todos</button>
                  <button onClick={() => { setPage(1); setCurrentFilter('aprovados'); }} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${currentFilter === 'aprovados' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'text-muted-foreground hover:text-foreground'}`}>⭐ Favoritos</button>
                  <button onClick={() => { setPage(1); setCurrentFilter('rejeitados'); }} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${currentFilter === 'rejeitados' ? 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-red-400' : 'text-muted-foreground hover:text-foreground'}`}>🗑️ Descartados</button>
                </div>
                <div className="flex items-center gap-3">
                  <select value={syncDays} onChange={(e) => setSyncDays(Number(e.target.value))} disabled={loading} className="h-10 rounded-lg border border-border bg-white dark:bg-[#09090b] text-sm font-medium px-3 text-foreground focus:ring-2 focus:ring-primary outline-none cursor-pointer">
                    <option value={3}>Últimos 3 dias</option>
                    <option value={7}>Últimos 7 dias</option>
                    <option value={30}>Últimos 30 dias</option>
                  </select>
                  <button onClick={handleSync} disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-bold text-sm h-10 shadow-sm active:scale-95">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Buscando...' : 'Nova busca'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {licitacoes.length === 0 ? (
                  <Card className="border-dashed border-2 bg-transparent shadow-none">
                    <CardContent className="p-16 text-center text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-border" />
                      <p className="text-lg font-medium">{loading ? "Buscando novas licitações..." : "Nenhum edital encontrado no radar."}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {licitacoes.map((item) => (
                      <Card key={item.id} className={`overflow-hidden transition-all duration-200 border-l-[6px] ${item.status === 'aprovado' ? 'border-l-primary bg-primary/5' : item.status === 'rejeitado' ? 'border-l-destructive bg-destructive/5' : item.priority === 'alta' ? 'border-l-amber-400 bg-amber-50/50 dark:bg-amber-900/10' : 'border-l-blue-400 bg-card'} hover:shadow-lg border-y border-r border-border`}>
                        <CardContent className="p-6">
                          <div className="flex flex-col xl:flex-row justify-between items-start gap-6">
                            <div className="space-y-4 w-full">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="px-3 py-1 rounded-full bg-muted text-xs font-bold text-muted-foreground border border-border uppercase tracking-wider">{item.orgao_nome}</span>
                                <span className="px-3 py-1 rounded-full bg-muted text-xs font-bold text-muted-foreground border border-border tracking-wider">{item.estado_sigla} / {item.cidade || 'Capital'}</span>

                                {item.priority === 'alta' && <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black border border-amber-200 uppercase tracking-widest">🔥 Hot Score: {item.score}%</span>}
                                
                                {item.edital_atualizado && (
                                  <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-black border border-blue-200 uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5" /> Edital Alterado
                                  </span>
                                )}

                                {item.status === 'aprovado' && <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Favoritado</span>}
                                {item.status === 'rejeitado' && <span className="text-[10px] font-black uppercase tracking-widest text-destructive bg-destructive/10 border border-destructive/20 px-3 py-1 rounded-full">Descartado</span>}
                              </div>
                              <div className="cursor-pointer group/title" onClick={() => handleOpenDetail(item)}>
                                <h3 className="font-extrabold text-xl leading-snug text-card-foreground mb-2 group-hover/title:text-primary transition-colors pr-8">{item.titulo}</h3>
                              </div>
                              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/50">
                                <div>
                                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Valor Estimado</p>
                                  <p className={`text-base font-bold ${item.valor_estimado_total || item.analysis?.valor_estimado ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                    {(item.valor_estimado_total || item.analysis?.valor_estimado) ? (item.valor_estimado_total || item.analysis?.valor_estimado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Orçamento Sigiloso'}
                                  </p>
                                </div>
                                <div className="h-8 w-px bg-border"></div>
                                <div>
                                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Data Publicação</p>
                                  <p className="text-sm font-bold text-card-foreground">{new Date(item.data_publicacao).toLocaleDateString()}</p>
                                </div>
                                <div className="h-8 w-px bg-border"></div>
                                <div>
                                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Cotas ME/EPP</p>
                                  <p className="text-sm font-bold text-card-foreground flex items-center gap-1.5">
                                      {item.me_epp_status === 'exclusivo' ? '✔️ Exclusivo' : item.me_epp_status === 'parcial' ? '🌗 Parcial' : '❌ Não Aplicado'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions Column */}
                            <div className="flex xl:flex-col gap-2 shrink-0 border-t xl:border-t-0 xl:border-l border-border/50 pt-4 xl:pt-0 xl:pl-6 w-full xl:w-40 justify-start">
                              <button onClick={() => handleOpenDetail(item)} className="w-full px-3 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-all flex items-center justify-center xl:justify-between gap-2 group">
                                Detalhes <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                              </button>
                              
                              <div className="flex xl:flex-col gap-2 w-full">
                                {item.status !== 'aprovado' && <button onClick={() => handleStatusUpdate(item.id, 'aprovado')} className="w-full flex justify-center items-center px-3 py-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded-lg transition-all shadow-sm uppercase tracking-widest"><CheckCircle className="w-3 h-3 mr-1"/> Favoritar</button>}
                                {item.status !== 'rejeitado' && <button onClick={() => handleStatusUpdate(item.id, 'rejeitado', 'Manual')} className="w-full flex justify-center items-center px-3 py-2 text-[10px] font-bold text-muted-foreground bg-white dark:bg-zinc-900 border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 rounded-lg transition-all shadow-sm uppercase tracking-widest">Descartar</button>}
                              </div>
                              
                              <button onClick={() => handleAnalyze(item.id)} disabled={item.isAnalyzing} className={`mt-auto w-full flex justify-center items-center px-3 py-2 text-[10px] uppercase tracking-widest font-bold border rounded-lg transition-all shadow-sm gap-1.5 ${item.analysis ? "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" : "text-card-foreground bg-card border-border hover:bg-muted"}`}>
                                  {item.isAnalyzing ? "Analisando..." : item.analysis ? "🤖 Neural IA O.K." : "🤖 IA Parecer"}
                              </button>
                            </div>
                          </div>
                          
                          {item.analysis && (
                            <div className="mt-6 p-5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 rounded-xl border border-purple-100 dark:border-purple-800/30 lg:mr-52">
                              <h4 className="flex items-center gap-2 text-xs font-black text-purple-900 dark:text-purple-400 uppercase tracking-widest mb-3">
                                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                 Parecer do Analista IA
                              </h4>
                              <p className="text-sm text-card-foreground leading-relaxed mb-4">{item.analysis.resumo}</p>
                              <div className="flex gap-6 mb-4 bg-white/50 dark:bg-zinc-950/50 p-3 rounded-lg border border-purple-100 dark:border-purple-900/50">
                                <div><h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Viabilidade</h5><span className="text-xs font-black text-emerald-600">{item.analysis.potencial}</span></div>
                                <div className="h-8 w-px bg-purple-200 dark:bg-purple-900/50"></div>
                                <div><h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Risco Operacional</h5><span className="text-xs font-black text-destructive">{item.analysis.risco}</span></div>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {item.analysis.tags?.map(tag => <span key={tag} className="px-2.5 py-1 text-[9px] uppercase font-black text-purple-700 bg-card border border-purple-200 dark:border-purple-800 rounded-md shadow-sm">#{tag}</span>)}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-center items-center mt-8 pb-12">
                <div className="flex bg-card rounded-lg shadow-sm border border-border">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="px-6 py-2.5 border-r border-border disabled:opacity-50 text-sm font-bold transition-all hover:bg-muted text-muted-foreground hover:text-foreground">Anterior</button>
                  <span className="px-6 py-2.5 text-sm font-black text-foreground bg-muted/50">Página {page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="px-6 py-2.5 border-l border-border disabled:opacity-50 text-sm font-bold transition-all hover:bg-muted text-muted-foreground hover:text-foreground">Próxima</button>
                </div>
              </div>
            </div>
          )}

          {currentView === 'kanban' && <PipelineKanban onItemClick={handleOpenDetail} />}
          {currentView === 'estratégico' && <DashboardView />}
        </div>
      </main>

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
          onGenerateProposal={handleOpenProposal}
          licitacao={selectedLicitacao}
        />
      )}

      <NeuralChat />
    </div>
  );
}
