import asyncio
from playwright.async_api import async_playwright
import logging
from bs4 import BeautifulSoup

logger = logging.getLogger("uvicorn")

class PNCPScraper:
    async def scrape_items(self, pncp_id: str) -> list:
        parts = pncp_id.split('-')
        if len(parts) < 3:
            return []
        cnpj, ano, seq = parts[0], parts[1], parts[2]
        # remove padding from seq if any, but URL usually takes int or padded? 
        # The HTML dump showed .../2026/94 (int).
        # DB has ...-94.
        
        url = f"https://pncp.gov.br/app/editais/{cnpj}/{ano}/{int(seq)}"
        logger.info(f"Scraping items from {url}")
        
        items = []
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            try:
                await page.goto(url, timeout=60000)
                
                # Check for "Itens" tab
                try:
                    # Tabs are usually buttons or list items. In the dump: <span class="name">Itens</span> inside button
                    await page.click('button:has-text("Itens")', timeout=10000)
                except:
                    logger.warning("Itens tab not found or already active")

                await page.wait_for_selector('datatable-body-row', timeout=10000)
                
                while True:
                    # Extract current page rows
                    content = await page.content()
                    soup = BeautifulSoup(content, 'html.parser')
                    
                    rows = soup.find_all('datatable-body-row')
                    for row in rows:
                        cells = row.find_all('datatable-body-cell')
                        if len(cells) < 4: continue
                        
                        # Helper to get text
                        def get_text(cell):
                            return cell.get_text(strip=True)

                        # Mapping based on headers: Num, Desc, Qty, ValUnit, ValTotal
                        # Note: indices depend on visibility.
                        # Cell 0: Num
                        # Cell 1: Desc
                        # Cell 2: Qty
                        # Cell 3: ValUnit
                        
                        try:
                            num = get_text(cells[0])
                            desc = get_text(cells[1])
                            qty = get_text(cells[2])
                            val = get_text(cells[3])
                            
                            # Clean data
                            # Qty might be "2160" or "2.160,00"
                            qty = qty.replace('.', '').replace(',', '.')
                            
                            # Val might be "R$ 53,12"
                            val = val.replace('R$', '').strip().replace('.', '').replace(',', '.')
                            
                            items.append({
                                "numero_item": int(num) if num.isdigit() else 0,
                                "descricao": desc,
                                "quantidade": float(qty) if qty else 0,
                                "valor_unitario": float(val) if val else 0,
                                "unidade": "UN" # Default
                            })
                        except Exception as e:
                            logger.error(f"Error parsing row: {e}")

                    # Check pagination "Next" button
                    # HTML: <button id="btn-next-page" ... disabled="">
                    next_btn = page.locator('#btn-next-page')
                    if await next_btn.is_visible() and not await next_btn.is_disabled():
                        await next_btn.click()
                        await asyncio.sleep(2) # Wait for load
                    else:
                        break
                        
            except Exception as e:
                logger.error(f"Scraping error: {e}")
            finally:
                await browser.close()
                
        return items
