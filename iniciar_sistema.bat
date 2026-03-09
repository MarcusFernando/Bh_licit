@echo off
echo ==========================================
echo   Brasilhosp Licitações - Iniciando Tudo   
echo ==========================================

start cmd /k "cd backend && title Backend FastAPI && python -m uvicorn main:app --reload"
echo [OK] Backend iniciado em nova janela.

start cmd /k "cd frontend && title Frontend React && npm run dev"
echo [OK] Frontend iniciado em nova janela.

echo.
echo Tudo pronto! O sistema abrira em instantes.
pause
