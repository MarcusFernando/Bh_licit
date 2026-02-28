"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, PieChart, TrendingUp, Filter, Layers, DollarSign } from "lucide-react";

interface ChartData {
    funnel: {
        stage: string;
        label: string;
        count: number;
        value: number;
    }[];
    top_orgaos: {
        name: string;
        value: number;
    }[];
}

export function DashboardView() {
    const [data, setData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/api/dashboard/charts");
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading || !data) return <div className="p-12 text-center text-zinc-400">Gerando relatórios estratégicos...</div>;

    const funnelData = data.funnel || [];
    const maxCount = Math.max(...funnelData.map(d => d.count), 1);
    const maxValue = Math.max(...funnelData.map(d => d.value), 1);

    // Dynamic Insights
    const bottleneck = funnelData.length > 0
        ? [...funnelData].sort((a, b) => b.count - a.count)[0]
        : { label: "Nenhum", count: 0 };

    const totalPipelineValue = funnelData.reduce((acc, curr) => acc + curr.value, 0);
    const totalPipelineCount = funnelData.reduce((acc, curr) => acc + curr.count, 0);
    const avgTicket = totalPipelineCount > 0 ? totalPipelineValue / totalPipelineCount : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Visual Funnel Chart */}
                <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <Filter className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Funil de Conversão</h3>
                                <p className="text-xs text-zinc-400">Fluxo de volume por etapa operacional</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            {funnelData.map((stage, idx) => {
                                // Calculate width based on count (funnel effect)
                                const widthPercent = 100 - (idx * 12);
                                const opacity = 1 - (idx * 0.12);

                                return (
                                    <div
                                        key={stage.stage}
                                        className="relative group transition-all duration-300"
                                        style={{ width: `${widthPercent}%` }}
                                    >
                                        <div
                                            className={`h-14 flex items-center justify-between px-6 rounded-lg shadow-sm border border-white/10 relative overflow-hidden transition-all group-hover:scale-[1.02] cursor-default`}
                                            style={{
                                                backgroundColor: `rgba(37, 99, 235, ${opacity})`,
                                                color: idx > 3 ? '#1e293b' : 'white'
                                            }}
                                        >
                                            {/* Glow effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black opacity-50 bg-black/10 w-6 h-6 flex items-center justify-center rounded-full">
                                                    {idx + 1}
                                                </span>
                                                <span className="font-bold text-sm tracking-tight uppercase">{stage.label}</span>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-xs font-black">{stage.count} <span className="text-[10px] opacity-70">ITENS</span></p>
                                                <p className="text-[10px] font-bold opacity-80">
                                                    {stage.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Connector line */}
                                        {idx < funnelData.length - 1 && (
                                            <div className="h-2 w-px bg-zinc-200 dark:bg-zinc-800 mx-auto opacity-20"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Orgaos Financial Distribution */}
                <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Maiores Demandantes</h3>
                                <p className="text-xs text-zinc-400">Top 5 órgãos por volume financeiro captado</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {data.top_orgaos.map((orgao) => {
                                const barWidth = data.top_orgaos.length > 0
                                    ? (orgao.value / data.top_orgaos[0].value) * 100
                                    : 0;
                                return (
                                    <div key={orgao.name} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate max-w-[200px]">{orgao.name}</span>
                                            <span className="text-sm font-black text-zinc-700 dark:text-zinc-300">
                                                {orgao.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>
                                        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg transition-all duration-1000"
                                                style={{ width: `${Math.max(barWidth, 2)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Strategic Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-none shadow-lg text-white">
                    <CardContent className="p-6">
                        <TrendingUp className="w-8 h-8 opacity-20 mb-4" />
                        <h4 className="text-sm font-bold opacity-80 uppercase tracking-widest mb-1">Crescimento de Base</h4>
                        <p className="text-2xl font-black mb-2">+12%</p>
                        <p className="text-[10px] opacity-70 leading-relaxed font-medium">Captação de novas oportunidades em relação ao mês anterior.</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 border-none shadow-lg text-white">
                    <CardContent className="p-6">
                        <Layers className="w-8 h-8 opacity-20 mb-4" />
                        <h4 className="text-sm font-bold opacity-80 uppercase tracking-widest mb-1">Gargalo Operacional</h4>
                        <p className="text-2xl font-black mb-2">{bottleneck.label}</p>
                        <p className="text-[10px] opacity-70 leading-relaxed font-medium">Fase com maior concentração de processos ({bottleneck.count} itens).</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-none shadow-lg text-white">
                    <CardContent className="p-6">
                        <PieChart className="w-8 h-8 opacity-20 mb-4" />
                        <h4 className="text-sm font-bold opacity-80 uppercase tracking-widest mb-1">Ticket Médio</h4>
                        <p className="text-2xl font-black mb-2">
                            {avgTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        <p className="text-[10px] opacity-70 leading-relaxed font-medium">Valor médio estimado por licitação ativa no radar.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
