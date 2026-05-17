@echo off
echo ==============================================
echo    Starting Aegis OS Complete Environment
echo ==============================================

echo [1/4] Starting Hardhat Blockchain Node...
start "Aegis OS - Hardhat Node" cmd /c "npx hardhat node"

echo Waiting 5 seconds for node to boot...
timeout /t 5 /nobreak > nul

echo [2/4] Deploying Smart Contracts and Seeding Data...
call npx hardhat run scripts/deploy.js --network localhost
call npx hardhat run scripts/setup-policy.js --network localhost
call npx hardhat run scripts/seed-audit-data.js --network localhost

echo [3/4] Starting FastAPI Backend...
start "Aegis OS - Python Backend" cmd /c "cd backend && uvicorn main:app --reload --workers 1"

echo [4/4] Starting React Frontend...
start "Aegis OS - React Frontend" cmd /c "cd frontend && npm run dev"

echo ==============================================
echo   All systems started successfully!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo ==============================================
pause
