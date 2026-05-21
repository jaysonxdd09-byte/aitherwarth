$root = "C:\Users\aithe\Music\lol-main\lol-main"

Write-Host "Starting AitherWarth services..." -ForegroundColor Cyan

# Launch PocketBase in its own auto-restarting window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
  while (`$true) {
    Write-Host 'Starting PocketBase...' -ForegroundColor Green
    & '$root\pocketbase\pocketbase.exe' serve --http='127.0.0.1:8090'
    Write-Host 'PocketBase stopped. Restarting in 2s...' -ForegroundColor Yellow
    Start-Sleep 2
  }
" -WindowStyle Normal

Start-Sleep -Seconds 2

# Launch Dev server in its own auto-restarting window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
  Set-Location '$root'
  while (`$true) {
    Write-Host 'Starting dev server...' -ForegroundColor Cyan
    npm run dev
    Write-Host 'Dev server stopped. Restarting in 2s...' -ForegroundColor Yellow
    Start-Sleep 2
  }
" -WindowStyle Normal

Write-Host ""
Write-Host "Both services started in separate windows!" -ForegroundColor Green
Write-Host "Website  -> http://localhost:8080" -ForegroundColor White
Write-Host "PocketBase -> http://127.0.0.1:8090" -ForegroundColor White
Write-Host ""
Write-Host "Close those windows to stop the services." -ForegroundColor Gray
