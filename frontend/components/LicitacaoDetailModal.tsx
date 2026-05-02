"use client";

import React, { useState, useEffect } from 'react';
import { X, FileText, Info, AlertTriangle, CheckCircle, Tag, ExternalLink, Calendar, MapPin, Building, ChevronRight, Clock, History, MessageSquare, Download, Send, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LicitacaoItem {
    id: number;
    numero_item: number;
    descricao: string;
    quantidade: number;
    unidade: string;
    valor_unitario: number;
}

interface EditalVersion {
    versao: number;
    titulo_arquivo: string;
    url: string;
    data_publicacao: string;
    is_latest: boolean;
}

interface Impugnacao {
    id: number;
    tipo: string;
    texto: string;
    status: string;
    data_criacao: string;
    resposta_texto?: string;
}

interface LicitacaoDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerateProposal: (licitacao: any) => void;
    licitacao: any;
}

export function LicitacaoDetailModal({ isOpen, onClose, onGenerateProposal, licitacao }: LicitacaoDetailModalProps) {
    const [activeTab, setActiveTab] = useState<'items' | 'editais' | 'impugnacoes' | 'anvisa'>('items');
    const [items, setItems] = useState<LicitacaoItem[]>([]);
    const [editais, setEditais] = useState<EditalVersion[]>([]);
    const [impugnacoes, setImpugnacoes] = useState<Impugnacao[]>([]);
    const [anvisaData, setAnvisaData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [anvisaLoading, setAnvisaLoading] = useState(false);

    // Form state for new impugnação
    const [newImpugnacao, setNewImpugnacao] = useState({ tipo: 'esclarecimento', texto: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && licitacao?.id) {
            fetchData();
            if (licitacao.edital_atualizado) {
                clearUpdateFlag(licitacao.id);
            }
        }
    }, [isOpen, licitacao]);

    const fetchData = async () => {
        if (!licitacao?.id) return;
        setLoading(true);
        try {
            // Parallel fetch
            const [itemsRes, editaisRes, impRes] = await Promise.all([
                fetch(`http://127.0.0.1:8000/api/licitacoes/${licitacao.id}/items`),
                fetch(`http://127.0.0.1:8000/api/licitacoes/${licitacao.id}/editais`),
                fetch(`http://127.0.0.1:8000/api/licitacoes/${licitacao.id}/impugnacoes`)
            ]);

            if (itemsRes.ok) setItems(await itemsRes.json());
            if (editaisRes.ok) setEditais(await editaisRes.json());
            if (impRes.ok) setImpugnacoes(await impRes.json());
        } catch (error) {
            console.error("Failed to fetch modal data", error);
        } finally {
            setLoading(false);
        }
    };

    const clearUpdateFlag = async (id: number) => {
        try {
            await fetch(`http://127.0.0.1:8000/api/licitacoes/${id}/clear-update-flag`, { method: 'PATCH' });
        } catch (e) { }
    };

    const handleAddImpugnacao = async () => {
        if (!newImpugnacao.texto.trim()) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/licitacoes/${licitacao.id}/impugnacoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newImpugnacao)
            });
            if (res.ok) {
                const added = await res.json();
                setImpugnacoes([added, ...impugnacoes]);
                setNewImpugnacao({ ...newImpugnacao, texto: '' });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFetchAnvisa = async () => {
        if (anvisaData) return; // Cache local por sessão
        setAnvisaLoading(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/cmed/cruzar/${licitacao.id}`, { method: 'POST' });
            if (res.ok) {
                setAnvisaData(await res.json());
            }
        } catch (e) {
            console.error("Erro ANVISA:", e);
        } finally {
            setAnvisaLoading(false);
        }
    };

    if (!isOpen || !licitacao) return null;

    const { analysis } = licitacao;

    const formatDeadline = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return 'Expirado';
        if (days === 0) return 'Hoje';
        return `Em ${days} dias (${date.toLocaleDateString()})`;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header Section */}
                <div className="relative p-8 border-b border-zinc-100 dark:border-zinc-900 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                        <X className="w-6 h-6 text-zinc-500" />
                    </button>

                    <div className="flex flex-wrap gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${licitacao.priority === 'alta' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-blue-100 text-blue-600 border border-blue-200'}`}>
                            {licitacao.priority === 'alta' ? '🔥 Alta Prioridade' : '⚡ Média Prioridade'}
                        </span>

                        {licitacao.modalidade && (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 border border-indigo-200">
                                🏛️ {licitacao.modalidade}
                            </span>
                        )}

                        {licitacao.modo_disputa && (
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${licitacao.modo_disputa === 'aberto' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
                                {licitacao.modo_disputa === 'aberto' ? '🔓 Modo Aberto' : '🔒 Modo Fechado'}
                            </span>
                        )}

                        {licitacao.edital_atualizado && (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                                🔔 Edital Atualizado
                            </span>
                        )}
                    </div>

                    <h2 className="text-2xl font-black leading-tight text-zinc-900 dark:text-zinc-50 mb-4 max-w-5xl">
                        {licitacao.titulo}
                    </h2>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-500 font-medium">
                        <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-zinc-400" />
                            <span className="truncate max-w-[300px]">{licitacao.orgao_nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-zinc-400" />
                            <span>{licitacao.cidade || 'N/A'} - {licitacao.estado_sigla}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-zinc-400" />
                            <span>{licitacao.pncp_id}</span>
                        </div>
                    </div>
                </div>

                {/* Main Body */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row p-8 gap-8 bg-white dark:bg-zinc-950">
                    {/* Left Column (Main Content & Tabs) */}
                    <div className="flex-1 flex flex-col space-y-8 overflow-y-auto pr-2 scrollbar-thin">

                        {/* Summary Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <p className="text-[10px] font-black uppercase text-zinc-400 mb-2 flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Abertura Propostas
                                </p>
                                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                    {licitacao.data_abertura_proposta ? new Date(licitacao.data_abertura_proposta).toLocaleString() : 'Não informada'}
                                </p>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <p className="text-[10px] font-black uppercase text-zinc-400 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3 text-amber-500" /> Limite Impugnação
                                </p>
                                <p className={`text-sm font-bold ${formatDeadline(licitacao.data_limite_impugnacao).includes('Expirado') ? 'text-red-500' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                    {formatDeadline(licitacao.data_limite_impugnacao)}
                                </p>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <p className="text-[10px] font-black uppercase text-zinc-400 mb-2 flex items-center gap-2">
                                    <Info className="w-3 h-3 text-blue-500" /> Limite Esclarecimento
                                </p>
                                <p className={`text-sm font-bold ${formatDeadline(licitacao.data_limite_esclarecimento).includes('Expirado') ? 'text-red-500' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                    {formatDeadline(licitacao.data_limite_esclarecimento)}
                                </p>
                            </div>
                        </div>

                        {/* Analysis Section (Neural Highlight) */}
                        {analysis && (
                            <div className="space-y-4">
                                <div className="bg-purple-50/30 dark:bg-purple-900/5 p-6 rounded-2xl border border-purple-100 dark:border-purple-900/30 space-y-3">
                                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-black text-xs uppercase tracking-widest">
                                        <Info className="w-4 h-4" /> Análise Crítica Neural
                                    </div>
                                    <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed italic">"{analysis.racional || analysis.resumo}"</p>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 dark:bg-zinc-900/80 rounded-lg border border-purple-100 dark:border-purple-900/20">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Risco:</span>
                                            <span className="text-[11px] font-black text-red-600">{analysis.risco}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 dark:bg-zinc-900/80 rounded-lg border border-purple-100 dark:border-purple-900/20">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Viabilidade:</span>
                                            <span className={`text-[11px] font-black ${analysis.gatekeeper === 'passou' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {analysis.gatekeeper === 'passou' ? 'ALTA' : analysis.potencial.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {analysis.habilitacao_resumo && (
                                    <div className="bg-blue-50/30 dark:bg-blue-900/5 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 space-y-3">
                                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-black text-xs uppercase tracking-widest">
                                            <CheckCircle className="w-4 h-4" /> Requisitos de Habilitação Extraídos
                                        </div>
                                        <div className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-line bg-white/50 dark:bg-zinc-900/50 p-4 rounded-xl border border-blue-50 dark:border-blue-900/20">
                                            {analysis.habilitacao_resumo}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tabs Interface */}
                        <div className="flex-col pb-4">
                            <div className="flex gap-4 border-b border-zinc-100 dark:border-zinc-900 mb-6">
                                <button
                                    onClick={() => setActiveTab('items')}
                                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all px-2 ${activeTab === 'items' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    📦 Itens ({items.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('editais')}
                                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all px-2 ${activeTab === 'editais' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    <History className="w-3.5 h-3.5 inline mr-1" /> Editais ({editais.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('impugnacoes')}
                                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all px-2 ${activeTab === 'impugnacoes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> Impugnações ({impugnacoes.length})
                                </button>
                                <button
                                    onClick={() => { setActiveTab('anvisa'); handleFetchAnvisa(); }}
                                    className={`pb-3 text-xs font-black uppercase tracking-widest transition-all px-2 ${activeTab === 'anvisa' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    🩺 Tabela ANVISA
                                </button>
                            </div>

                            <div className="mt-4 pr-2">
                                {loading ? (
                                    <div className="py-20 flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-zinc-500 text-xs font-bold uppercase animate-pulse">Consultando PNCP...</p>
                                    </div>
                                ) : activeTab === 'items' ? (
                                    <div className="space-y-3 pb-8">
                                        {items.length === 0 ? (
                                            <div className="p-12 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-900 rounded-3xl">
                                                <p className="text-zinc-400 text-sm font-medium">Nenhum item detalhado disponível.</p>
                                            </div>
                                        ) : items.map((item) => (
                                            <Card key={item.id} className="border-zinc-100 dark:border-zinc-800 shadow-none hover:border-blue-100 dark:hover:border-blue-900/50 transition-all bg-zinc-50/50 dark:bg-zinc-900/20 overflow-hidden">
                                                <CardContent className="p-5 flex gap-5 items-start">
                                                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-sm">
                                                        <span className="font-black text-blue-600 text-base">{item.numero_item}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 leading-relaxed mb-3">{item.descricao}</p>
                                                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                                                                <span className="bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">QUANTIDADE</span>
                                                                <span className="text-zinc-800 dark:text-zinc-100">{item.quantidade} {item.unidade}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                                                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-1.5 py-0.5 rounded">VALOR REF</span>
                                                                <span className="text-blue-600">{item.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                    <div className="space-y-4 pb-8">
                                        {editais.map((edital, idx) => (
                                            <div key={idx} className={`p-5 rounded-2xl border flex items-center justify-between ${edital.is_latest ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${edital.is_latest ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-sm font-black text-zinc-800 dark:text-zinc-100">{edital.titulo_arquivo}</p>
                                                            {edital.is_latest && <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase rounded tracking-tighter">MAIS RECENTE</span>}
                                                        </div>
                                                        <p className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5">
                                                            <Calendar className="w-3 h-3" /> Publicado em {new Date(edital.data_publicacao).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <a href={edital.url} target="_blank" className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all text-blue-600">
                                                    <Download className="w-5 h-5" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : activeTab === 'anvisa' ? (
                                    <div className="space-y-6 pb-8">
                                        {anvisaLoading ? (
                                            <div className="p-12 text-center space-y-4">
                                                <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                                                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Cruzando dados com a base da ANVISA...</p>
                                            </div>
                                        ) : anvisaData ? (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800">
                                                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Cobertura</p>
                                                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{anvisaData.cobertura_percentual}%</p>
                                                        <p className="text-[10px] font-bold text-emerald-600/60 mt-1 uppercase italic">Itens localizados na CMED</p>
                                                    </div>
                                                    <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                                        <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Total de Itens</p>
                                                        <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{anvisaData.total_itens}</p>
                                                    </div>
                                                    <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                                        <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Localizados</p>
                                                        <p className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{anvisaData.total_com_preco_referencia}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    {anvisaData.cruzamentos.map((cross: any, idx: number) => (
                                                        <div key={idx} className={`p-6 rounded-3xl border transition-all ${cross.match_encontrado ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm' : 'bg-zinc-50/50 dark:bg-zinc-900/30 border-dashed border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                                                            <div className="flex justify-between items-start gap-4">
                                                                <div className="space-y-3 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Item {idx+1}</span>
                                                                        {cross.match_encontrado ? (
                                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase rounded">Match Encontrado</span>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[8px] font-black uppercase rounded">Não Localizado</span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1">{cross.descricao_item}</p>
                                                                    
                                                                    {cross.match_encontrado && (
                                                                        <div className="flex flex-wrap gap-4 pt-2">
                                                                            <div>
                                                                                <p className="text-[8px] font-black text-zinc-400 uppercase">Substância</p>
                                                                                <p className="text-[11px] font-bold text-emerald-600 uppercase">{cross.melhor_match.substancia}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[8px] font-black text-zinc-400 uppercase">Laboratório</p>
                                                                                <p className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">{cross.melhor_match.laboratorio}</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {cross.match_encontrado && (
                                                                    <div className="text-right p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/5 border border-emerald-100/50 dark:border-emerald-800/20">
                                                                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Preço Fábrica (Ref)</p>
                                                                        <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                                                                            {cross.preco_fabrica_medio?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                        </p>
                                                                        <div className="mt-1 flex gap-2 justify-end opacity-60">
                                                                            <span className="text-[8px] font-bold uppercase">Min: {cross.preco_fabrica_min?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                            <span className="text-[8px] font-bold uppercase">Max: {cross.preco_fabrica_max?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="p-12 text-center">
                                                <p className="text-zinc-500">Erro ao carregar dados da ANVISA.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : activeTab === 'editais' ? (
                                    <div className="space-y-6 pb-8">
                                        {/* New Request Form */}
                                        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-black uppercase text-zinc-800 dark:text-zinc-200 tracking-widest">Novo Pedido Interno</h4>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setNewImpugnacao({ ...newImpugnacao, tipo: 'esclarecimento' })}
                                                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border transition-all ${newImpugnacao.tipo === 'esclarecimento' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'}`}
                                                    >
                                                        Esclarecimento
                                                    </button>
                                                    <button
                                                        onClick={() => setNewImpugnacao({ ...newImpugnacao, tipo: 'impugnacao' })}
                                                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border transition-all ${newImpugnacao.tipo === 'impugnacao' ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'}`}
                                                    >
                                                        Impugnação
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                value={newImpugnacao.texto}
                                                onChange={(e) => setNewImpugnacao({ ...newImpugnacao, texto: e.target.value })}
                                                placeholder="Descreva aqui as dúvidas técnicas ou pontos de impugnação detectados no edital..."
                                                className="w-full h-32 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:text-zinc-200 resize-none mb-2"
                                            />
                                            <button
                                                disabled={isSubmitting || !newImpugnacao.texto.trim()}
                                                onClick={handleAddImpugnacao}
                                                className="w-full py-3 bg-blue-600 disabled:bg-zinc-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-[0.98]"
                                            >
                                                {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                                                Salvar Rascunho para Portal
                                            </button>
                                        </div>

                                        {/* List of existing */}
                                        <div className="space-y-4">
                                            {impugnacoes.map((imp) => (
                                                <div key={imp.id} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl space-y-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${imp.tipo === 'impugnacao' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                {imp.tipo}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">{new Date(imp.data_criacao).toLocaleString()}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(imp.texto)}
                                                            className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-all"
                                                        >
                                                            <Copy className="w-3 h-3" /> Copiar Texto
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{imp.texto}</p>
                                                    {imp.resposta_texto && (
                                                        <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl">
                                                            <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Resposta Oficial do Órgão</p>
                                                            <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">{imp.resposta_texto}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Sidebar Specs) */}
                    <div className="w-full lg:w-80 flex flex-col space-y-6">
                        <div className="bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-6 space-y-6">
                            <div>
                                <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4">Resumo Financeiro</h4>
                                <div className="p-4 bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700 mb-4">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Valor Estimado Total</p>
                                    <p className={`text-xl font-black ${licitacao.valor_estimado_total ? 'text-zinc-900 dark:text-zinc-50' : 'text-emerald-600 dark:text-emerald-400 animate-pulse'}`}>
                                        {licitacao.valor_estimado_total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || '🔒 Orçamento Sigiloso'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700">
                                        <p className="text-[8px] font-bold text-zinc-400 uppercase mb-1">SRP</p>
                                        <p className="text-xs font-black text-zinc-700 dark:text-zinc-300">{licitacao.srp ? '✅ SIM' : '❌ NÃO'}</p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700">
                                        <p className="text-[8px] font-bold text-zinc-400 uppercase mb-1">ME/EPP</p>
                                        <p className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                                            {licitacao.me_epp_status === 'exclusivo' ? '🏛️ EXCLUSIVO' : 
                                             licitacao.me_epp_status === 'parcial' ? '🌗 PARCIAL' : '❌ NÃO'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Painel de Decisão</p>
                                <button onClick={() => onGenerateProposal(licitacao)} className="w-full py-3.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2">
                                    <Send className="w-4 h-4" /> Gerar Proposta V4
                                </button>
                                {licitacao.link_sistema_origem && (
                                    <a href={licitacao.link_sistema_origem} target="_blank" className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 bg-white rounded-full animate-ping mr-1"></div> Sala de Disputa
                                    </a>
                                )}
                                <a href={licitacao.link_edital} target="_blank" className="w-full py-3.5 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2">
                                    <ExternalLink className="w-4 h-4" /> Ver Portal PNCP
                                </a>
                            </div>
                        </div>

                        {/* Support Card */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white relative overflow-hidden group shadow-xl">
                            <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Info className="w-40 h-40" />
                            </div>
                            <div className="relative z-10 space-y-4">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                    <Info className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-black text-lg">IA de Apoio Legal</h4>
                                    <p className="text-[10px] text-indigo-100 leading-relaxed font-bold uppercase tracking-tight">V4 Neural Context</p>
                                </div>
                                <p className="text-xs text-indigo-100 leading-relaxed">
                                    Esta licitação possui termos complexos no edital. Recomenda-se solicitar esclarecimentos sobre o item {items[0]?.numero_item || 1}.
                                </p>
                                <button className="w-full py-2 bg-white text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all">
                                    Abrir Consultoria IA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
