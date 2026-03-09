"use client";

import React, { useState, useEffect } from 'react';
import { X, FileText, Info, AlertTriangle, CheckCircle, Tag, ExternalLink, Calendar, MapPin, Building, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LicitacaoItem {
    id: number;
    numero_item: number;
    descricao: string;
    quantidade: number;
    unidade: string;
    valor_unitario: number;
}

interface LicitacaoDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    licitacao: any; // Using any for now to match the existing object structure
}

export function LicitacaoDetailModal({ isOpen, onClose, licitacao }: LicitacaoDetailModalProps) {
    const [items, setItems] = useState<LicitacaoItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    useEffect(() => {
        if (isOpen && licitacao?.id) {
            fetchItems(licitacao.id);
        }
    }, [isOpen, licitacao]);

    const fetchItems = async (id: number) => {
        setLoadingItems(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/licitacoes/${id}/items`);
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (error) {
            console.error("Failed to fetch items", error);
        } finally {
            setLoadingItems(false);
        }
    };

    if (!isOpen || !licitacao) return null;

    const { analysis } = licitacao;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header Section */}
                <div className="relative p-8 border-b border-zinc-100 dark:border-zinc-900 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                        <X className="w-6 h-6 text-zinc-500" />
                    </button>

                    <div className="flex flex-wrap gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${licitacao.priority === 'alta' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-blue-100 text-blue-600 border border-blue-200'}`}>
                            {licitacao.priority === 'alta' ? '🔥 Alta Prioridade' : '⚡ Média Prioridade'}
                        </span>
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                            📍 {licitacao.estado_sigla}
                        </span>
                        {licitacao.score && (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600 border border-emerald-200">
                                💎 Score {licitacao.score}%
                            </span>
                        )}
                    </div>

                    <h2 className="text-2xl font-black leading-tight text-zinc-900 dark:text-zinc-50 mb-4 max-w-4xl">
                        {licitacao.titulo}
                    </h2>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-500 font-medium">
                        <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-zinc-400" />
                            <span>{licitacao.orgao_nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            <span>Publicado em: {new Date(licitacao.data_publicacao).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-blue-500" />
                            <a href={licitacao.link_edital} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Ver no PNCP</a>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 overflow-auto p-8 bg-white dark:bg-zinc-950">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Side: Details & Items */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Analysis Section if exists */}
                            {analysis && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-lg">
                                        <Info className="w-5 h-5 text-purple-600" />
                                        <h3>Análise Crítica IA</h3>
                                    </div>

                                    <div className="bg-purple-50/50 dark:bg-purple-900/10 p-6 rounded-2xl border border-purple-100 dark:border-purple-800/50 space-y-4">
                                        <div>
                                            <p className="text-xs font-black uppercase text-purple-600 mb-1 tracking-widest">Justificativa</p>
                                            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed italic">"{analysis.racional}"</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/80 dark:bg-zinc-900/80 p-3 rounded-xl border border-purple-100 dark:border-purple-800/20">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Gatekeeper</p>
                                                <p className={`font-bold text-sm ${analysis.gatekeeper === 'passou' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {analysis.gatekeeper === 'passou' ? '✅ Aprovado Técnico' : '❌ Falhou Técnico'}
                                                </p>
                                            </div>
                                            <div className="bg-white/80 dark:bg-zinc-900/80 p-3 rounded-xl border border-purple-100 dark:border-purple-800/20">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Risco</p>
                                                <p className="font-bold text-sm text-red-600">{analysis.risco}</p>
                                            </div>
                                        </div>

                                        {analysis.tags && analysis.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {analysis.tags.map((tag: string) => (
                                                    <span key={tag} className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] font-black uppercase tracking-tight">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Items Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-lg">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                        <h3>Itens da Licitação</h3>
                                    </div>
                                    <span className="text-xs font-bold px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full">
                                        {items.length} itens encontrados
                                    </span>
                                </div>

                                {loadingItems ? (
                                    <div className="py-12 flex justify-center">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : items.length === 0 ? (
                                    <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 rounded-2xl">
                                        <p className="text-zinc-400 text-sm">Nenhum item detalhado disponível para esta licitação.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {items.map((item) => (
                                            <Card key={item.id} className="border-zinc-100 dark:border-zinc-800 shadow-none hover:border-blue-200 dark:hover:border-blue-900 transition-all">
                                                <CardContent className="p-4 flex gap-4 items-start">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                                        <span className="font-black text-blue-600 text-xs">{item.numero_item}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 leading-snug mb-1">{item.descricao}</p>
                                                        <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                            <span>📦 Qtd: {item.quantidade} {item.unidade}</span>
                                                            <span className="text-blue-500">💰 Est: {item.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Quick Specs & Summary */}
                        <div className="space-y-6">
                            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6">
                                <h4 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-4">Resumo Executivo</h4>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-zinc-200 dark:border-zinc-800">
                                        <span className="text-sm text-zinc-500">Valor Estimado</span>
                                        <span className="text-lg font-black text-zinc-800 dark:text-zinc-100">
                                            {licitacao.valor_estimado_total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-zinc-200 dark:border-zinc-800">
                                        <span className="text-sm text-zinc-500">Estado</span>
                                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100 underline decoration-blue-500 decoration-2">{licitacao.estado_sigla}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-zinc-500">Status Interno</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${licitacao.status === 'aprovado' ? 'bg-emerald-100 text-emerald-700' : licitacao.status === 'rejeitado' ? 'bg-red-100 text-red-700' : 'bg-zinc-200 text-zinc-600'}`}>
                                            {licitacao.status || 'recebido'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-3">Ações Possíveis</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        <button onClick={onClose} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95">
                                            Gerar Proposta Comercial
                                        </button>
                                        <a href={licitacao.link_edital} target="_blank" className="w-full py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-sm font-bold text-center hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all">
                                            Acessar Edital Oficial
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-none text-white overflow-hidden">
                                <CardContent className="p-6 relative">
                                    <div className="absolute -right-4 -bottom-4 opacity-10">
                                        <Info className="w-32 h-32" />
                                    </div>
                                    <h4 className="font-bold text-lg mb-2">Suporte Neural Brasilhosp</h4>
                                    <p className="text-xs text-blue-100 leading-relaxed mb-4">
                                        Precisa de ajuda com esta licitação? Use o Chat Neural V3 para tirar dúvidas técnicas sobre o objeto ou requisitos.
                                    </p>
                                    <button className="bg-white text-blue-700 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tight">
                                        Abrir Chat Neural
                                    </button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
