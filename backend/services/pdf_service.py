import pypdf
import io

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extrai texto puro de um arquivo PDF (em bytes).
    """
    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Erro ao ler PDF: {e}")
        return ""
