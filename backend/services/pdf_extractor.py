import io
from pypdf import PdfReader
from services.llm_engine import LLMEngine

class PDFExtractor:
    def __init__(self):
        self.llm = LLMEngine()

    async def extract_items(self, file_content: bytes) -> list:
        try:
            # 1. Read PDF
            reader = PdfReader(io.BytesIO(file_content))
            text = ""
            
            # Extract text from first 10 pages (enough for most editais to show items)
            # If items are at end, we might miss them, but full PDF is too big for LLM context.
            # Strategy: Extract first 5 pages AND pages containing "Tabela" or "Item" or "Quantidade"?
            # For MVP, first 10 pages is a good heuristic.
            max_pages = min(len(reader.pages), 10)
            for i in range(max_pages):
                page_text = reader.pages[i].extract_text()
                if page_text:
                    text += page_text + "\n"
            
            # 2. Add specific search for "Termo de Referência" if logic allows (skipped for now)
            
            # 3. Send to LLM
            items = await self.llm.extract_items_from_text(text)
            return items
            
        except Exception as e:
            print(f"PDF Extraction Error: {e}")
            return []
    
    async def close(self):
        await self.llm.close()
