"use client";

import { useState, useRef } from "react";
import { uploadEdital } from "../api";
import { Icons } from "../icons";
import Link from "next/link";

interface EditalResult {
    orgao: string;
    edital: string;
    objeto: string;
    data_abertura: string;
    valor_estimado: string | number | null;
}

export default function LeitorEdital() {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<EditalResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>("");
    const fileRef = useRef<HTMLInputElement>(null);

    async function handleFile(file: File) {
        if (!file.name.endsWith(".pdf")) {
            setError("Apenas arquivos PDF são permitidos.");
            return;
        }

        setFileName(file.name);
        setUploading(true);
        setError(null);
        setResult(null);

        try {
            const res = await uploadEdital(file);
            setResult(res.data);
        } catch (e: any) {
            setError(e.message || "Erro ao processar PDF.");
        } finally {
            setUploading(false);
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(true);
    }

    function handleDragLeave() {
        setIsDragging(false);
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }

    return (
        <div className="flex min-h-screen font-sans bg-[#0d1117] text-[#e6edf3]">

            {/* Sidebar */}
            <aside className="w-16 md:w-64 border-r border-[#30363d] flex-shrink-0 flex flex-col bg-[#010409]">
                <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-[#30363d]">
                    <Icons.Chart className="text-[#2f81f7] w-6 h-6" />
                    <span className="ml-3 font-bold text-lg hidden md:block tracking-tighter">BH.LICIT<span className="text-[#2f81f7]">_v2</span></span>
                </div>

                <nav className="flex-1 p-2 space-y-1">
                    <Link href="/" className="flex items-center gap-3 px-3 py-2 text-[#7d8590] hover:text-[#e6edf3] hover:bg-[#161b22] transition-colors text-sm font-medium cursor-pointer">
                        <Icons.Search className="w-4 h-4" />
                        <span className="hidden md:block">Monitoramento</span>
                    </Link>
                    <div className="flex items-center gap-3 px-3 py-2 bg-[#21262d] border-l-2 border-[#2f81f7] text-white text-sm font-medium cursor-pointer">
                        <Icons.Robot className="w-4 h-4" />
                        <span className="hidden md:block">Leitor de Editais</span>
                    </div>
                </nav>

                <div className="p-4 border-t border-[#30363d] text-[10px] text-[#7d8590] hidden md:block font-mono text-center">
                    PDF_READER // READY
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* Header */}
                <header className="h-16 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between px-6">
                    <div className="flex flex-col">
                        <h2 className="text-sm font-bold text-[#e6edf3] tracking-wide uppercase">Leitor de Editais</h2>
                        <span className="text-xs text-[#7d8590] font-mono">Upload PDF → IA → Dados Estruturados</span>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 bg-[#0d1117]">
                    <div className="max-w-3xl mx-auto space-y-6">

                        {/* Drop Zone */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300
                ${isDragging
                                    ? "border-[#2f81f7] bg-[#2f81f7]/10 scale-[1.02]"
                                    : "border-[#30363d] bg-[#010409] hover:border-[#484f58] hover:bg-[#161b22]"}
                ${uploading ? "pointer-events-none opacity-50" : ""}
              `}
                        >
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleInputChange}
                                className="hidden"
                            />

                            {uploading ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 border-4 border-[#30363d] border-t-[#2f81f7] rounded-full animate-spin" />
                                    <p className="text-[#7d8590] font-mono text-sm">Processando <span className="text-[#e6edf3]">{fileName}</span>...</p>
                                    <p className="text-[10px] text-[#484f58] font-mono">Extraindo texto → Analisando com IA → Salvando</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-[#21262d] flex items-center justify-center">
                                        <svg className="w-8 h-8 text-[#2f81f7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[#e6edf3] font-medium">Arraste o PDF aqui ou clique para selecionar</p>
                                        <p className="text-xs text-[#7d8590] mt-1 font-mono">Suporta .PDF (Editais, Pregões, Atas)</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="border border-[#f85149]/40 bg-[#f85149]/10 p-4 text-sm">
                                <span className="text-[#f85149] font-bold">ERRO:</span>
                                <span className="text-[#e6edf3] ml-2">{error}</span>
                            </div>
                        )}

                        {/* Result Card */}
                        {result && (
                            <div className="border border-[#238636] bg-[#238636]/5 rounded-lg overflow-hidden">
                                <div className="px-6 py-3 bg-[#238636]/20 border-b border-[#238636]/30 flex items-center gap-2">
                                    <span className="text-[#3fb950] text-sm font-bold">✅ EDITAL PROCESSADO</span>
                                    <span className="text-[10px] text-[#7d8590] font-mono ml-auto">Salvo no Banco de Dados</span>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] text-[#7d8590] uppercase tracking-wider font-mono">Órgão</label>
                                            <p className="text-[#e6edf3] font-medium mt-1">{result.orgao || "—"}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-[#7d8590] uppercase tracking-wider font-mono">Edital / Pregão</label>
                                            <p className="text-[#e6edf3] font-medium mt-1">{result.edital || "—"}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-[#7d8590] uppercase tracking-wider font-mono">Data de Abertura</label>
                                            <p className="text-[#e6edf3] font-medium mt-1">{result.data_abertura || "—"}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-[#7d8590] uppercase tracking-wider font-mono">Valor Estimado</label>
                                            <p className="text-[#3fb950] font-bold mt-1 text-lg">
                                                {result.valor_estimado ? `R$ ${result.valor_estimado}` : "—"}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-[#7d8590] uppercase tracking-wider font-mono">Objeto</label>
                                        <p className="text-[#e6edf3] mt-1 text-sm leading-relaxed bg-[#161b22] p-3 border border-[#30363d] rounded">
                                            {result.objeto || "—"}
                                        </p>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => { setResult(null); setFileName(""); }}
                                            className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#30363d] text-[#7d8590] hover:text-[#e6edf3] hover:border-[#484f58] bg-[#21262d] transition-all"
                                        >
                                            Analisar Outro PDF
                                        </button>
                                        <Link
                                            href="/"
                                            className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-[#238636] text-[#3fb950] hover:bg-[#238636]/20 transition-all"
                                        >
                                            Ver no Dashboard →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
}
