import React, { useState, useEffect } from "react";
import { X, Calendar, FileText, Banknote, MapPin, Tag, RefreshCw, Layers, Monitor, Target } from "lucide-react";
import { API_URL } from "@/app/api";

export interface OpportunityDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    licitacao: any; // Using any here for quick dev, but should match Licitacao interface
}

export function OpportunityDetailsModal({ isOpen, onClose, licitacao }: OpportunityDetailsModalProps) {
    const [items, setItems] = useState<any[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);

    useEffect(() => {
        if (isOpen && licitacao) {
            fetchItems();
        }
    }, [isOpen, licitacao]);

    const fetchItems = async () => {
        try {
            setLoadingItems(true);
            const res = await fetch(`${API_URL}/licitacoes/${licitacao.id}/items`);
            const data = await res.json();
            setItems(data.items || []);
        } catch (e) {
            console.error("Error fetching items", e);
        } finally {
            setLoadingItems(false);
        }
    };

    if (!isOpen || !licitacao) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-950 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">

                {/* Header - Fixed */}
                <div className="flex justify-between items-center p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100/50 text-blue-600 flex items-center justify-center border border-blue-200/50">
                            <Monitor className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                                {licitacao.orgao_nome}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black tracking-widest uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/30">
                                    {licitacao.categoria || 'PREGÃO ELETRÔNICO'}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">ID: {licitacao.pncp_id}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 mr-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-zinc-950">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column: Metrics & Info */}
                        <div className="space-y-6">
                            {/* Key Dates (Effecti highlight style) */}
                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Prazos e Disputa
                                </h3>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Publicação</label>
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                                            {new Date(licitacao.data_publicacao).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                                        <label className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Data da Sessão</label>
                                        <p className="text-sm font-black text-red-700 dark:text-red-400 mt-0.5">
                                            {licitacao.data_abertura_proposta ? new Date(licitacao.data_abertura_proposta).toLocaleString() : 'Não informada'}
                                        </p>
                                    </div>
                                </div>

                                {licitacao.modo_disputa && (
                                    <div className="flex items-center gap-2 justify-between p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/30">
                                        <span className="text-xs font-bold text-orange-800 dark:text-orange-400">Modo de Disputa PNCP</span>
                                        <span className="text-xs font-black uppercase text-orange-900 dark:text-orange-300 bg-orange-200 dark:bg-orange-800/50 px-2 py-0.5 rounded">
                                            {licitacao.modo_disputa}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Meta Info */}
                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-zinc-400 mt-1" />
                                    <div>
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Localidade</p>
                                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{licitacao.estado_sigla} {licitacao.cidade ? `- ${licitacao.cidade}` : ''}</p>
                                    </div>
                                </div>
                                <div className="w-full h-px bg-zinc-100 dark:bg-zinc-800"></div>
                                <div className="flex items-start gap-3">
                                    <Target className="w-4 h-4 text-zinc-400 mt-1" />
                                    <div>
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Análise de Prioridade</p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className="text-sm font-black text-amber-600 dark:text-amber-500">{licitacao.score}% MATCH</span>
                                            <span className="px-2 py-0.5 text-[9px] uppercase font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800/50">{licitacao.priority}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Object & Items */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Object */}
                            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4" /> Objeto da Contratação
                                </h3>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                    {licitacao.titulo}
                                </p>
                            </div>

                            {/* Items Table (Effecti-inspired) */}
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                        <Layers className="w-4 h-4" /> Itens com Palavras-Chave
                                    </h3>
                                    <span className="text-xs font-bold text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                                        {items.length} itens encontrados
                                    </span>
                                </div>

                                <div className="overflow-x-auto max-h-[300px]">
                                    {loadingItems ? (
                                        <div className="p-12 flex justify-center items-center text-zinc-400">
                                            <RefreshCw className="w-6 h-6 animate-spin" />
                                        </div>
                                    ) : items.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-500 text-sm font-medium">
                                            Nenhum item listado ou carregamento pendente do PNCP.
                                        </div>
                                    ) : (
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="text-[10px] uppercase font-black text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 sticky top-0 shadow-sm">
                                                <tr>
                                                    <th className="px-4 py-3">Item</th>
                                                    <th className="px-4 py-3 w-full">Descrição Base</th>
                                                    <th className="px-4 py-3 text-right">Qtd</th>
                                                    <th className="px-4 py-3 text-center">Unid</th>
                                                    <th className="px-4 py-3 text-right">Valor Unit. Est.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                {items.map(i => (
                                                    <tr key={i.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                        <td className="px-4 py-3 font-mono text-xs font-bold text-zinc-400">{i.numero_item}</td>
                                                        <td className="px-4 py-3">
                                                            <p className="truncate max-w-[250px] md:max-w-[400px] font-medium text-zinc-800 dark:text-zinc-200" title={i.descricao}>
                                                                {i.descricao}
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{i.quantidade}</td>
                                                        <td className="px-4 py-3 text-center text-xs font-bold text-zinc-500">{i.unidade}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                            R$ {i.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-end gap-3">
                    <a
                        href={licitacao.link_edital}
                        target="_blank"
                        className="px-4 py-2 rounded-lg font-bold text-sm bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                    >
                        Acessar Portal PNCP
                    </a>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                    >
                        Fechar Detalhes
                    </button>
                </div>
            </div>
        </div>
    );
}
