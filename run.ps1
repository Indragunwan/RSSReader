# Feeds Application Launcher

# 1. Kill any existing processes (optional but recommended to clear ports)
try { Stop-Process -Name "uvicorn" -ErrorAction SilentlyContinue } catch {}
try { Get-Process | Where-Object { $_.CommandLine -like "*vite*" } | Stop-Process -Force -ErrorAction SilentlyContinue } catch {}

Write-Host "--- Starting Feeds Backend (Port 8000) ---" -ForegroundColor Cyan
# Start Backend in a new window
# We use the full path to python.exe to avoid activation issues
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

Write-Host "--- Starting Feeds Frontend (Port 5173) ---" -ForegroundColor Cyan
# Start Frontend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nFeeds Reader is starting up!" -ForegroundColor Green
Write-Host "1. Wait a few seconds for the status messages in the other windows."
Write-Host "2. Open http://localhost:5173 in your browser." -ForegroundColor Yellow
Write-Host "3. To add a feed, click the '+' icon and paste a URL (e.g., https://news.ycombinator.com)."
