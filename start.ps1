Set-Location $PSScriptRoot
if (-not (Test-Path "node_modules")) { npm install }
if (-not (Test-Path "mobile\\node_modules")) { npm install --prefix mobile }
if (-not (Test-Path "admin\\node_modules")) { npm install --prefix admin }
if (-not (Test-Path "server\\node_modules")) { npm install --prefix server }
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev:all"
Start-Sleep -Seconds 6
Start-Process "http://localhost:10086/"
Start-Process "http://localhost:4101/"
Start-Process "http://localhost:4100/"
