export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function buscarLicitacoes() {
    const res = await fetch(`${API_URL}/licitacoes/`, { cache: "no-store" });
    if (!res.ok) throw new Error("Falha ao buscar licitações");
    return res.json();
}

export async function rodarRobo() {
    const res = await fetch(`${API_URL}/rodar-robo/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) throw new Error("Falha ao iniciar robô");
    return res.json();
}

export async function checkJobStatus(jobId: string) {
    const res = await fetch(`${API_URL}/job-status/${jobId}`, { cache: "no-store" });
    if (!res.ok) return { status: "error" };
    return res.json();
}

export async function deleteLicitacao(id: number) {
    const res = await fetch(`${API_URL}/licitacoes/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Falha ao deletar");
    return res.json();
}

export async function retryLicitacao(id: number) {
    const res = await fetch(`${API_URL}/licitacoes/${id}/retry`, { method: "POST" });
    if (!res.ok) throw new Error("Falha ao reanalisar");
    return res.json();
}

export async function uploadEdital(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    
    const res = await fetch(`${API_URL}/tools/read-edital`, {
        method: "POST",
        body: formData,
    });
    
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Falha ao enviar edital");
    }
    return res.json();
}
