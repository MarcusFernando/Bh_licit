import { useState, useEffect, useRef } from 'react';
import { Send, BrainCircuit, X } from 'lucide-react';

interface AgentMessage {
    id: number;
    sender: string;
    content: string;
    media_url?: string;
    created_at: string;
}

export function NeuralChat() {
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async () => {
        try {
            const res = await fetch('http://127.0.0.1:8000/api/messages');
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        try {
            const res = await fetch('http://127.0.0.1:8000/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender: "Agente Comercial - Bryan",
                    content: input
                })
            });
            if (res.ok) {
                setInput('');
                fetchMessages();
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition-all z-50 flex items-center gap-2"
            >
                <BrainCircuit size={24} />
                <span className="font-bold">Chat Neural V3</span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-96 max-h-[600px] h-[80vh] bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
            <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2 text-purple-400">
                    <BrainCircuit size={20} />
                    <h3 className="font-bold">Mente Coletiva (V3)</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0B1120]">
                <div className="text-center text-xs text-slate-500 mb-4">
                    Conectado ao Database Central (Marcus - Rede 4)
                </div>
                {messages.map((msg) => {
                    const isMe = msg.sender.includes("Bryan");
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] text-slate-500 mb-1 ml-1">
                                {msg.sender}
                            </span>
                            <div className={`p-3 rounded-lg max-w-[85%] text-sm ${isMe ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                                {msg.content}
                                {msg.media_url && (
                                    <img src={msg.media_url} alt="anexo" className="mt-2 rounded max-w-full" />
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            <div className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
                <input
                    className="flex-1 bg-[#0B1120] border border-slate-600 text-slate-200 text-sm focus-visible:ring-purple-500 rounded-md px-3 py-2"
                    placeholder="Comunicação IA para IA..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage} className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center justify-center">
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
}
