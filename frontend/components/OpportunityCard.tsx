import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, FileText, CheckCircle2, XCircle, Bot, Link as LinkIcon, Star, Target, Maximize2 } from "lucide-react";
import { OpportunityDetailsModal } from "./OpportunityDetailsModal";

export interface Licitacao {
    id: number;
    titulo: string;
    orgao_nome: string;
    estado_sigla: string;
    data_publicacao: string;
    data_abertura_proposta?: string;
    link_edital: string;
    status: string;
    rejection_reason?: string;
    priority?: string;
    score?: number;
    // Categorização (if available on the backend)
    categoria?: string;
    modo_disputa?: string;
    pipeline_stage?: string;
    // AI Analysis Data
    analysis?: {
        resumo: string;
        potencial: string;
        risco: string;
        tags: string[];
    };
    isAnalyzing?: boolean;
}

interface OpportunityCardProps {
    item: Licitacao;
    onStatusUpdate: (id: number, newStatus: string, reason?: string) => void;
    onAnalyze: (id: number) => void;
    onOpenProposal: (item: Licitacao) => void;
}

export function OpportunityCard({ item, onStatusUpdate, onAnalyze, onOpenProposal }: OpportunityCardProps) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    return (
        <>
            <Card
                className={`overflow-hidden transition-all duration-300 border-l-4 ${item.status === 'aprovado' ? 'border-l-emerald-500 bg-white dark:bg-zinc-900' :
                    item.status === 'rejeitado' ? 'border-l-red-500 bg-white dark:bg-zinc-900 opacity-60 hover:opacity-100' :
                        item.priority === 'alta' ? 'border-l-yellow-400 bg-yellow-50/10 dark:bg-yellow-900/10' :
                            'border-l-blue-500 bg-white dark:bg-zinc-900'
                    } hover:shadow-xl hover:shadow-black/5 group flex flex-col`}>
                <CardContent className="p-0 flex flex-col h-full">
                    <div onClick={() => setIsDetailsOpen(true)} className="cursor-pointer flex flex-col h-full">
                        {/* TOP SECTION: PROCESS MARKERS */}
                        <div className="flex items-center gap-2 flex-wrap bg-zinc-50 dark:bg-zinc-900/50 p-4 border-b border-zinc-100 dark:border-zinc-800">

                            {/* Modalidade / Categoria Badge (Licitanet-inspired) */}
                            <span className="px-2.5 py-1 rounded-md bg-blue-100/50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[11px] font-black uppercase tracking-wider border border-blue-200/50 dark:border-blue-800/50 shrink-0">
                                {item.categoria || 'PREGÃO ELETRÔNICO'}
                            </span>

                            {/* Modo de Disputa Badge */}
                            {item.modo_disputa && (
                                <span className="px-2.5 py-1 rounded-md bg-orange-100/50 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 text-[11px] font-black uppercase tracking-wider border border-orange-200/50 dark:border-orange-800/50 shrink-0">
                                    Modo {item.modo_disputa}
                                </span>
                            )}

                            {/* Status do Processo Badge */}
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest border border-zinc-200 dark:border-zinc-700 shrink-0">
                                {item.status === 'aprovado' ? (
                                    <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        APROVADA
                                    </>
                                ) : item.status === 'rejeitado' ? (
                                    <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        ARQUIVADA
                                    </>
                                ) : (
                                    <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                        RECEBENDO PROPOSTA
                                    </>
                                )}
                            </span>

                            <div className="grow"></div>

                            <button
                                onClick={(e) => { e.stopPropagation(); setIsDetailsOpen(true); }}
                                className="mr-2 text-zinc-400 hover:text-blue-500 transition-colors"
                                title="Expandir Detalhes"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>

                            <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase tracking-wide shrink-0">
                                📍 {item.estado_sigla}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 bg-white dark:bg-zinc-950 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0">
                                Publicado: {new Date(item.data_publicacao).toLocaleDateString()}
                            </span>
                            {item.data_abertura_proposta && (
                                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded border border-red-200 dark:border-red-900/30 shadow-sm shrink-0">
                                    Sessão: {new Date(item.data_abertura_proposta).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {/* MID SECTION: CONTENT */}
                        <div className="p-6 grow flex flex-col justify-center bg-white dark:bg-zinc-950">
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <h3 className="font-bold text-base leading-snug text-zinc-900 dark:text-zinc-100 line-clamp-3">
                                    {item.titulo}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                                <span className="truncate">🏢 {item.orgao_nome}</span>
                            </div>

                            {/* Smart Prioritization Banner */}
                            {(item.priority === 'alta' || item.priority === 'media') && item.status !== 'rejeitado' && (
                                <div className="mt-4 flex items-center gap-2">
                                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${item.priority === 'alta'
                                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
                                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
                                        }`}>
                                        <Target className="w-3 h-3" />
                                        Match Rating: {item.score}%
                                    </span>
                                </div>
                            )}

                            {/* AI Analysis Result (Collapsible Area) */}
                            {item.analysis && (
                                <div className="mt-5 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 rounded-xl border border-purple-100/50 dark:border-purple-800/30 shadow-inner">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg text-white shrink-0 shadow-md">
                                            <Bot className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-3 w-full">
                                            <div>
                                                <h4 className="text-[10px] font-black text-purple-900/70 dark:text-purple-100/70 uppercase tracking-widest mb-1">Resumo Executivo Llama 3.3</h4>
                                                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">{item.analysis.resumo}</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                                <div className="bg-white/50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-purple-50 dark:border-purple-900/20 shadow-sm">
                                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Potencial Comercial</h4>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded textxs font-bold uppercase tracking-wider ${item.analysis.potencial === 'Alto' ? 'text-emerald-700 dark:text-emerald-400' :
                                                        item.analysis.potencial === 'Médio' ? 'text-amber-700 dark:text-amber-400' :
                                                            'text-zinc-700 dark:text-zinc-400'
                                                        }`}>
                                                        {item.analysis.potencial}
                                                    </span>
                                                </div>
                                                <div className="bg-white/50 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-purple-50 dark:border-purple-900/20 shadow-sm">
                                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Alertas / Riscos Processuais</h4>
                                                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold line-clamp-2" title={item.analysis.risco}>
                                                        {item.analysis.risco}
                                                    </p>
                                                </div>
                                            </div>

                                            {item.analysis.tags && item.analysis.tags.length > 0 && (
                                                <div className="flex gap-2 flex-wrap pt-2">
                                                    {item.analysis.tags.map(tag => (
                                                        <span key={tag} className="px-2 py-1 text-[9px] uppercase font-black tracking-widest text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-900/50 rounded-md shadow-sm">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* BOTTOM SECTION: ACTION BAR (Licitanet-inspired) */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/80 px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                {/* Portal Link */}
                                <a
                                    href={item.link_edital}
                                    target="_blank"
                                    className="p-2 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 hover:shadow-sm"
                                    title="Acessar Portal (Visualizar Edital)"
                                >
                                    <LinkIcon className="w-4 h-4" />
                                </a>
                                {/* Generate Proposal */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onOpenProposal(item); }}
                                    className="p-2 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-white dark:hover:bg-zinc-800 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 hover:shadow-sm"
                                    title="Análise Fina / Gerar Proposta Comercial"
                                >
                                    <FileText className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                                {/* Status Actions */}
                                {item.status !== 'aprovado' && item.status !== 'rejeitado' && (
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onStatusUpdate(item.id, 'rejeitado', 'Manual'); }}
                                            className="p-2.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm transition-all focus:outline-none"
                                            title="Mover para Lixeira"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onStatusUpdate(item.id, 'aprovado'); }}
                                            className="p-2.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm transition-all focus:outline-none"
                                            title="Aprovar Oportunidade (Ir para Pipeline)"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                                {item.status === 'rejeitado' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onStatusUpdate(item.id, 'recebido'); }}
                                        className="p-2.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm transition-all focus:outline-none"
                                        title="Restaurar da Lixeira"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                    </button>
                                )}
                                {item.status === 'aprovado' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onStatusUpdate(item.id, 'recebido'); }}
                                        className="p-2.5 rounded-lg text-emerald-600 bg-white shadow-sm dark:bg-zinc-800 transition-all focus:outline-none cursor-default"
                                        title="Oportunidade Aprovada no Pipeline"
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                )}

                                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2"></div>

                                {/* Marcus AI (Aimê equivalent) Action - Premium Badge */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAnalyze(item.id); }}
                                    disabled={item.isAnalyzing}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${item.isAnalyzing ? 'bg-zinc-100 text-zinc-400 cursor-wait' :
                                        item.analysis ? 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200' :
                                            'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-md hover:shadow-purple-500/25 hover:-translate-y-0.5 border border-transparent'
                                        }`}
                                    title="Análise Avançada de Risco (Marcus AI)"
                                >
                                    {item.isAnalyzing ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Star className={`w-3.5 h-3.5 ${item.analysis ? 'fill-purple-700 text-purple-700' : 'fill-white text-white'}`} />
                                    )}
                                    {item.isAnalyzing ? 'Analisando...' : item.analysis ? 'IA Analisada' : 'Análise IA'}
                                </button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de Detalhes (Effecti Style) */}
            <OpportunityDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                licitacao={item}
            />
        </>
    );
}
