"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, ArrowRight, CheckCircle2, XCircle, Clock, Send, Trophy, MoreHorizontal, RefreshCw, ChevronLeft, LayoutDashboard } from "lucide-react";

interface Licitacao {
    id: number;
    titulo: string;
    orgao_nome: string;
    data_publicacao: string;
    pipeline_stage?: string;
    priority?: string;
    valor_estimado_total?: number;
    valor_final_lance?: number;
}

const STAGES = [
    { id: "radar", name: "Radar", icon: Clock, color: "text-zinc-500", bg: "bg-zinc-100" },
    { id: "analise", name: "Análise", icon: FileText, color: "text-blue-500", bg: "bg-blue-100" },
    { id: "habilitacao", name: "Habilitação", icon: MoreHorizontal, color: "text-amber-500", bg: "bg-amber-100" },
    { id: "proposta_enviada", name: "Proposta", icon: Send, color: "text-indigo-500", bg: "bg-indigo-100" },
    { id: "disputa", name: "Disputa", icon: ArrowRight, color: "text-purple-500", bg: "bg-purple-100" },
    { id: "concluido", name: "Finalizado", icon: Trophy, color: "text-emerald-500", bg: "bg-emerald-100" },
];

function Badge({ children, className, variant = "default" }: any) {
    const styles: any = {
        default: "bg-blue-600 text-white",
        secondary: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
    }
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]} ${className}`}>{children}</span>
}

export function PipelineKanban() {
    const [items, setItems] = useState<Licitacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [draggedId, setDraggedId] = useState<number | null>(null);

    const fetchItems = async () => {
        try {
            if (!refreshing) setLoading(true);
            const res = await fetch("http://127.0.0.1:8000/api/pipeline/items");
            if (res.ok) {
                const data = await res.json();
                console.log("Pipeline items received:", data.length);
                setItems(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const moveStage = async (id: number, newStage: string) => {
        // Optimistic update
        const originalItems = [...items];
        setItems(prev => prev.map(item => item.id === id ? { ...item, pipeline_stage: newStage } : item));

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/licitacoes/${id}/pipeline?stage=${newStage}`, {
                method: "PATCH",
            });
            if (!res.ok) {
                setItems(originalItems);
                alert("Erro ao mover proposta");
            }
        } catch (err) {
            console.error(err);
            setItems(originalItems);
        }
    };

    const handleDragStart = (e: React.DragEvent, id: number) => {
        setDraggedId(id);
        e.dataTransfer.setData("id", id.toString());
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, stageId: string) => {
        e.preventDefault();
        const id = parseInt(e.dataTransfer.getData("id"));
        if (!isNaN(id)) {
            moveStage(id, stageId);
        }
        setDraggedId(null);
    };

    const updateBidValue = async (id: number, val: number) => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/licitacoes/${id}/pipeline?stage=concluido&valor_final_lance=${val}`, {
                method: "PATCH"
            });
            if (res.ok) {
                setItems(prev => prev.map(item => item.id === id ? { ...item, valor_final_lance: val, pipeline_stage: 'concluido' } : item));
            }
        } catch (err) { console.error(err); }
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-24 text-zinc-400 gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="font-medium italic">Sincronizando fluxo operacional...</p>
        </div>
    );

    return (
        <div className="flex gap-4 overflow-x-auto pb-8 min-h-[70vh] select-none scrollbar-hide">
            {STAGES.map(stage => {
                const stageItems = items.filter(i => (i.pipeline_stage || "radar") === stage.id);
                const stageTotal = stageItems.reduce((acc, curr) => acc + (curr.valor_estimado_total || 0), 0);

                return (
                    <div
                        key={stage.id}
                        className="flex-shrink-0 w-80 flex flex-col gap-4"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, stage.id)}
                    >
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${stage.bg}`}>
                                        <stage.icon className={`w-3.5 h-3.5 ${stage.color}`} />
                                    </div>
                                    <h3 className="font-bold text-xs uppercase tracking-tight text-zinc-700 dark:text-zinc-300">{stage.name}</h3>
                                </div>
                                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold h-4">
                                    {stageItems.length}
                                </Badge>
                            </div>
                            <div className="mt-1">
                                <p className="text-[10px] text-zinc-400 font-medium">Equilíbrio do Funil</p>
                                <p className={`text-sm font-black ${stage.color}`}>
                                    {stageTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                            </div>
                        </div>

                        <div
                            className={`flex-1 flex flex-col gap-3 p-1 overflow-y-auto max-h-[65vh] scrollbar-hide rounded-2xl transition-colors ${draggedId ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''}`}
                        >
                            {stageItems.length === 0 ? (
                                <div className="border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-300 text-[10px] flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                                        <stage.icon className="w-3.5 h-3.5 opacity-30" />
                                    </div>
                                    Sem processos ativos
                                </div>
                            ) : (
                                stageItems.map(item => (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item.id)}
                                        className={`cursor-grab active:cursor-grabbing transform transition-all duration-200 ${draggedId === item.id ? 'opacity-40 scale-95' : 'hover:scale-[1.02]'}`}
                                    >
                                        <Card className="group relative overflow-hidden shadow-sm border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-800">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex gap-1.5">
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase ${item.priority === 'alta' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                                                            {item.priority === 'alta' ? '🔥 ALTA' : '⚡ MEDIA'}
                                                        </span>
                                                        {item.valor_estimado_total && item.valor_estimado_total > 500000 && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm bg-emerald-500 text-white uppercase">
                                                                💎 VIP
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Move helper for touch/accessibility */}
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                        <LayoutDashboard className="w-3 h-3 text-zinc-300" />
                                                    </div>
                                                </div>

                                                <h4 className="text-xs font-bold mb-1.5 leading-tight text-zinc-900 dark:text-zinc-100 line-clamp-2">
                                                    {item.titulo}
                                                </h4>

                                                <div className="flex items-center gap-1.5 mb-3 text-[10px] text-zinc-500 font-medium">
                                                    <span className="truncate max-w-[150px]">🏢 {item.orgao_nome}</span>
                                                </div>

                                                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 mb-2">
                                                    <div className="flex justify-between items-end">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Valor</span>
                                                            <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                                                                {(item.valor_estimado_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </span>
                                                        </div>
                                                        {item.valor_final_lance ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Ganhamos</span>
                                                                <span className="text-xs font-black text-emerald-600">
                                                                    {item.valor_final_lance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                </span>
                                                            </div>
                                                        ) : stage.id === 'concluido' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const v = prompt("Qual o valor final do lance?");
                                                                    if (v) updateBidValue(item.id, parseFloat(v));
                                                                }}
                                                                className="text-[9px] font-bold text-blue-600 hover:underline"
                                                            >
                                                                + Lance
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center text-[8px] text-zinc-400 font-bold uppercase mt-2 pt-2 border-t border-zinc-50 dark:border-zinc-800/50">
                                                    <span className="flex items-center gap-1"><Clock className="w-2 h-2" /> {new Date(item.data_publicacao).toLocaleDateString('pt-BR')}</span>
                                                    <span>{item.id}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
