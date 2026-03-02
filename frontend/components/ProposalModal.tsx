import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Loader2, Save, Trash2 } from 'lucide-react';

interface Item {
    id: number;
    numero_item: number;
    descricao: string;
    quantidade: number;
    unidade: string;
    valor_unitario: number; // Estimated value from PNCP
}

interface ProposalModalProps {
    licitacaoId: number | null;
    licitacaoTitulo: string;
    isOpen: boolean;
    onClose: () => void;
}

interface AddItemFormProps {
    licitacaoId: number | null;
    onAdd: () => void;
}

function AddItemForm({ licitacaoId, onAdd }: AddItemFormProps) {
    const [newItem, setNewItem] = useState({ numero_item: 1, descricao: '', quantidade: 1, valor_unitario: 0, unidade: 'UN' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!licitacaoId) return;
        setLoading(true);
        try {
            await fetch(`http://127.0.0.1:8000/api/licitacoes/${licitacaoId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            setNewItem({ ...newItem, numero_item: newItem.numero_item + 1, descricao: '', quantidade: 1, valor_unitario: 0 });
            onAdd();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 items-end w-full max-w-3xl">
            <div className="w-16">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Item</label>
                <input
                    required
                    type="number"
                    className="w-full text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                    value={newItem.numero_item || ''}
                    onChange={e => setNewItem({ ...newItem, numero_item: e.target.value ? parseInt(e.target.value) : 0 })}
                />
            </div>
            <div className="flex-1">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Descrição</label>
                <input
                    required
                    className="w-full text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                    value={newItem.descricao}
                    onChange={e => setNewItem({ ...newItem, descricao: e.target.value })}
                    placeholder="Descrição do item..."
                />
            </div>
            <div className="w-20">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Unid.</label>
                <input
                    required
                    className="w-full text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                    value={newItem.unidade}
                    onChange={e => setNewItem({ ...newItem, unidade: e.target.value })}
                />
            </div>
            <div className="w-20">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Qtd</label>
                <input
                    required
                    type="number"
                    className="w-full text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                    value={newItem.quantidade || ''}
                    onChange={e => setNewItem({ ...newItem, quantidade: e.target.value ? parseFloat(e.target.value) : 0 })}
                />
            </div>
            <div className="w-24">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Val. Est.</label>
                <input
                    type="number"
                    step="0.01"
                    className="w-full text-sm bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                    value={newItem.valor_unitario || ''}
                    onChange={e => setNewItem({ ...newItem, valor_unitario: e.target.value ? parseFloat(e.target.value) : 0 })}
                />
            </div>
            <button disabled={loading} type="submit" className="bg-green-600 text-white px-3 py-1 rounded text-sm h-[30px] hover:bg-green-700 flex items-center justify-center min-w-[30px]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
        </form>
    );
}

export function ProposalModal({ licitacaoId, licitacaoTitulo, isOpen, onClose }: ProposalModalProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(false);
    const [prices, setPrices] = useState<Record<number, number>>({}); // User defined prices
    const [total, setTotal] = useState(0);

    useEffect(() => {
        if (isOpen && licitacaoId) {
            fetchItems(licitacaoId);
        }
    }, [isOpen, licitacaoId]);

    // Recalculate total when prices change
    useEffect(() => {
        let t = 0;
        items.forEach(item => {
            const price = prices[item.id] !== undefined ? prices[item.id] : item.valor_unitario;
            t += price * item.quantidade;
        });
        setTotal(t);
    }, [prices, items]);

    const fetchItems = async (id: number) => {
        setLoading(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/licitacoes/${id}/items`);
            if (res.ok) {
                const data = await res.json();
                setItems(data);

                // Initialize prices with estimated status
                const initialPrices: Record<number, number> = {};
                data.forEach((i: Item) => {
                    initialPrices[i.id] = i.valor_unitario;
                });
                setPrices(initialPrices);
            }
        } catch (error) {
            console.error("Failed to fetch items", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePriceChange = (id: number, val: string) => {
        const num = parseFloat(val);
        setPrices(prev => ({ ...prev, [id]: isNaN(num) ? 0 : num }));
    };

    const handleDeleteItem = async (itemId: number) => {
        if (!confirm('Tem certeza que deseja excluir este item?')) return;
        if (!licitacaoId) return;

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/licitacoes/${licitacaoId}/items/${itemId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchItems(licitacaoId);
            } else {
                alert("Erro ao excluir item");
            }
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        if (!licitacaoId) return;

        const file = e.target.files[0];
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/licitacoes/${licitacaoId}/items/extract`, {
                method: 'POST',
                body: formData // No Content-Type header (browser sets it with boundary)
            });

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    fetchItems(licitacaoId);
                    alert(`${data.length} itens extraídos do PDF com sucesso!`);
                } else {
                    alert("Nenhum item encontrado no PDF.");
                }
            } else {
                alert("Erro ao processar PDF.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao enviar arquivo.");
        } finally {
            setLoading(false);
            // Clear input
            e.target.value = '';
        }
    };

    const handleClearAll = async () => {
        if (!confirm('ATENÇÃO: Deseja apagar TODOS os itens desta lista? Esta ação não pode ser desfeita.')) return;
        if (!licitacaoId) return;

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/licitacoes/${licitacaoId}/items`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchItems(licitacaoId);
            } else {
                alert("Erro ao limpar lista.");
            }
        } catch (error) {
            console.error("Failed to clear all", error);
        }
    };

    const handleGenerateDoc = async () => {
        if (!licitacaoId) return;

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/licitacoes/${licitacaoId}/proposal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prices }),
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Proposta_${licitacaoTitulo}.docx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert("Erro ao gerar documento.");
            }
        } catch (error) {
            console.error("Erro ao exportar:", error);
            alert("Erro ao exportar.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Gerador de Proposta
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl truncate">
                            {licitacaoTitulo}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p>Processando...</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                            <p className="mb-4">Nenhum item encontrado. Adicione manualmente ou importe do Edital.</p>

                            <div className="flex gap-4 mb-8">
                                <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200">
                                    <FileText className="w-4 h-4" />
                                    Importar PDF do Edital
                                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>

                            <AddItemForm licitacaoId={licitacaoId} onAdd={() => licitacaoId && fetchItems(licitacaoId)} />
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-end mb-2">
                                <label className="flex items-center gap-2 px-3 py-1 bg-zinc-100 text-zinc-600 rounded cursor-pointer hover:bg-zinc-200 text-xs font-medium">
                                    <FileText className="w-3 h-3" />
                                    Importar Itens (PDF)
                                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>
                            <table className="w-full text-sm text-left mb-4">
                                <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">Item</th>
                                        <th className="px-4 py-3">Descrição</th>
                                        <th className="px-4 py-3 text-center">Unid.</th>
                                        <th className="px-4 py-3 text-center">Qtd.</th>
                                        <th className="px-4 py-3 text-right">Preço Unit. (R$)</th>
                                        <th className="px-4 py-3 text-right rounded-r-lg">Total (R$)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {items.map((item) => (
                                        <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                                            <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{item.numero_item}</td>
                                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 max-w-md truncate" title={item.descricao}>
                                                {item.descricao}
                                            </td>
                                            <td className="px-4 py-3 text-center">{item.unidade}</td>
                                            <td className="px-4 py-3 text-center font-bold">{item.quantidade}</td>
                                            <td className="px-4 py-3 text-right">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-24 text-right bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={prices[item.id] ?? 0}
                                                    onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100 flex items-center justify-end gap-3">
                                                {((prices[item.id] || 0) * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                <button onClick={() => handleDeleteItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all" title="Excluir item">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="border-t border-dashed border-zinc-200 dark:border-zinc-700 pt-4">
                                <p className="text-xs font-semibold text-zinc-500 uppercase mb-2">Adicionar Item Manual</p>
                                <AddItemForm licitacaoId={licitacaoId} onAdd={() => licitacaoId && fetchItems(licitacaoId)} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center rounded-b-xl">
                    <div className="text-right">
                        <p className="text-sm text-zinc-500 uppercase font-bold tracking-wider">Valor Total da Proposta</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {items.length > 0 && (
                            <button onClick={handleClearAll} className="px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 font-medium transition-colors flex items-center gap-2">
                                <Trash2 className="w-4 h-4" />
                                Limpar Lista
                            </button>
                        )}
                        <button onClick={onClose} className="px-4 py-2 text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 font-medium transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={handleGenerateDoc}
                            disabled={loading || items.length === 0}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-5 h-5" />
                            Exportar DOCX
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
