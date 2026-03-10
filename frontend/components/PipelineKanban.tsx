"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, ArrowRight, CheckCircle2, Clock, Send, Trophy, MoreHorizontal, RefreshCw, LayoutDashboard, AlertCircle } from "lucide-react";

interface KanbanCard {
    id: number;
    titulo: string;
    orgao_nome: string;
    estado_sigla: string;
    data_publicacao: string;
    priority?: string;
    score?: number;
    link_edital: string;
    status: string;
    modalidade?: string;
    modo_disputa?: string;
    edital_atualizado?: boolean;
}

interface KanbanData {
    recebido: KanbanCard[];
    analise: KanbanCard[];
    aprovado: KanbanCard[];
    em_proposta: KanbanCard[];
}

const STAGES = [
    { id: "recebido", name: "Captadas", icon: Clock, color: "text-zinc-500", bg: "bg-zinc-100 dark:bg-zinc-800", border: "border-zinc-200 dark:border-zinc-700" },
    { id: "analise", name: "Em Análise", icon: FileText, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800" },
    { id: "aprovado", name: "Aprovadas", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800" },
    { id: "em_proposta", name: "Em Proposta", icon: Send, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-800" },
];

function PriorityBadge({ priority }: { priority?: string }) {
    if (priority === "alta") return <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-yellow-500 text-white uppercase">⭐ Alta</span>;
    if (priority === "media") return <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-400 text-white uppercase">⚡ Média</span>;
    return <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-zinc-400 text-white uppercase">— Baixa</span>;
}

export function PipelineKanban({ onItemClick }: { onItemClick?: (item: any) => void }) {
    const [data, setData] = useState<KanbanData>({ recebido: [], analise: [], aprovado: [], em_proposta: [] });
    const [loading, setLoading] = useState(true);
    const [draggedId, setDraggedId] = useState<number | null>(null);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const res = await fetch("http://127.0.0.1:8000/api/pipeline/items");
            if (res.ok) {
                const json: KanbanData = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error("Erro ao buscar pipeline:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchItems(); }, []);

    const moveCard = async (cardId: number, fromStage: string, toStage: string) => {
        const card = data[fromStage as keyof KanbanData].find(c => c.id === cardId);
        if (!card) return;

        setData(prev => ({
            ...prev,
            [fromStage]: prev[fromStage as keyof KanbanData].filter(c => c.id !== cardId),
            [toStage]: [...prev[toStage as keyof KanbanData], { ...card, status: toStage }],
        }));

        try {
            await fetch(`http://127.0.0.1:8000/api/licitacoes/${cardId}/status?status=${toStage}`, { method: "PATCH" });
        } catch (err) {
            console.error("Erro ao mover card:", err);
            fetchItems(); // rollback
        }
    };

    const handleDragStart = (e: React.DragEvent, id: number, fromStage: string) => {
        setDraggedId(id);
        e.dataTransfer.setData("id", id.toString());
        e.dataTransfer.setData("fromStage", fromStage);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, toStage: string) => {
        e.preventDefault();
        const id = parseInt(e.dataTransfer.getData("id"));
        const fromStage = e.dataTransfer.getData("fromStage");
        if (!isNaN(id) && fromStage !== toStage) {
            moveCard(id, fromStage, toStage);
        }
        setDraggedId(null);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-24 text-zinc-400 gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="font-medium">Carregando pipeline...</p>
        </div>
    );

    const totalCards = Object.values(data).reduce((a, b) => a + b.length, 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">📋 Pipeline Operacional</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">{totalCards} licitações no funil · Arraste para mover entre estágios</p>
                </div>
                <button onClick={fetchItems} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 transition-all">
                    <RefreshCw className="w-4 h-4" /> Atualizar
                </button>
            </div>

            {/* Board */}
            <div className="flex gap-6 overflow-x-auto pb-12 pr-12 min-h-[65vh] select-none scrollbar-thin scrollbar-thumb-zinc-800">
                {STAGES.map(stage => {
                    const stageItems = data[stage.id as keyof KanbanData] || [];
                    return (
                        <div
                            key={stage.id}
                            className="flex-shrink-0 w-96 flex flex-col gap-4"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage.id)}
                        >
                            {/* Column Header */}
                            <div className={`p-3 rounded-xl border ${stage.border} bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${stage.bg}`}>
                                            <stage.icon className={`w-3.5 h-3.5 ${stage.color}`} />
                                        </div>
                                        <span className="font-bold text-xs uppercase tracking-tight text-zinc-700 dark:text-zinc-300">{stage.name}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${stage.bg} ${stage.color}`}>
                                        {stageItems.length}
                                    </span>
                                </div>
                            </div>

                            {/* Cards */}
                            <div className={`flex-1 flex flex-col gap-2 p-1.5 rounded-xl min-h-[200px] transition-colors ${draggedId ? 'bg-blue-50/30 dark:bg-blue-900/10 border-2 border-dashed border-blue-200 dark:border-blue-800' : ''}`}>
                                {stageItems.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-300 dark:text-zinc-700 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-xl p-6 text-center">
                                        <stage.icon className="w-6 h-6 opacity-40" />
                                        <span className="text-[10px] font-semibold uppercase tracking-widest">Sem processos</span>
                                    </div>
                                ) : (
                                    stageItems.map(item => (
                                        <div
                                            key={item.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, item.id, stage.id)}
                                            className={`cursor-grab active:cursor-grabbing transform transition-all duration-150 ${draggedId === item.id ? 'opacity-40 scale-95 rotate-1' : 'hover:scale-[1.02] hover:-translate-y-0.5'}`}
                                        >
                                            <div
                                                onClick={() => onItemClick?.(item)}
                                                className={`shadow-sm border rounded-xl hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-zinc-900 overflow-hidden cursor-pointer ${item.edital_atualizado ? 'border-amber-400 ring-1 ring-amber-400/50' : 'border-zinc-200 dark:border-zinc-800'}`}
                                            >
                                                <div className="p-3.5">
                                                    {/* Badges row */}
                                                    <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                                                        <PriorityBadge priority={item.priority} />

                                                        {item.modalidade && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 uppercase truncate max-w-[100px]">{item.modalidade}</span>
                                                        )}

                                                        {item.modo_disputa && (
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${item.modo_disputa === 'aberto' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'}`}>
                                                                {item.modo_disputa === 'aberto' ? '🔓 Aberto' : '🔒 Fechado'}
                                                            </span>
                                                        )}

                                                        {item.edital_atualizado && (
                                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-white uppercase flex items-center gap-1 animate-pulse">
                                                                <AlertCircle className="w-2.5 h-2.5" /> Atualizado
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Title */}
                                                    <h4 className="text-sm font-bold leading-tight text-zinc-900 dark:text-zinc-100 line-clamp-3 mb-2">
                                                        {item.titulo}
                                                    </h4>

                                                    {/* Organ */}
                                                    <p className="text-[10px] text-zinc-500 truncate mb-3">🏢 {item.orgao_nome}</p>

                                                    {/* Footer */}
                                                    <div className="flex justify-between items-center text-[9px] text-zinc-400 font-bold uppercase border-t border-zinc-100 dark:border-zinc-800 pt-2 mt-1">
                                                        <span className="flex items-center gap-1">📅 {new Date(item.data_publicacao).toLocaleDateString('pt-BR')}</span>
                                                        <span className="text-zinc-300 dark:text-zinc-700">📍 {item.estado_sigla}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
