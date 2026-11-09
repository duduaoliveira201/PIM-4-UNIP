$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$webRoot = Join-Path $root 'BrewMaster.Web'
$apiProject = Join-Path $root 'BrewMaster.Api\BrewMaster.Api.csproj'
$publishDirectory = Join-Path $root 'BrewMaster.Api\bin\LanPublish'
$portableNode = Join-Path $root '.tools\node-v24.19.0-win-x64'
$port = 5180

if (Test-Path (Join-Path $portableNode 'node.exe')) {
    $env:Path = "$portableNode;$env:Path"
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    throw 'Node.js e npm não foram encontrados. Instale o Node.js ou adicione-o ao PATH.'
}

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    throw '.NET SDK não encontrado. Instale o SDK definido em global.json.'
}

Write-Host 'Compilando a aplicação web...' -ForegroundColor Cyan
Push-Location $webRoot
try {
    & $npmCommand.Source run build
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao compilar a aplicação web.'
    }
} finally {
    Pop-Location
}

Write-Host 'Publicando API e frontend para este computador...' -ForegroundColor Cyan
dotnet publish $apiProject --configuration Release --runtime win-x64 --self-contained true --output $publishDirectory
if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao publicar o servidor BrewMaster.'
}

$serverExecutable = Join-Path $publishDirectory 'BrewMaster.Api.exe'
if (-not (Test-Path $serverExecutable)) {
    throw "Executável do servidor não foi encontrado em $publishDirectory."
}

$localUrls = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -ExpandProperty IPAddress -Unique)

Write-Host ''
Write-Host 'Endereços para acessar o BrewMaster:' -ForegroundColor Green
Write-Host "  Neste computador: http://localhost:$port"
foreach ($ipAddress in $localUrls) {
    Write-Host "  Na rede local:    http://${ipAddress}:$port"
}
Write-Host ''
Write-Host 'Deixe esta janela aberta enquanto os outros computadores estiverem conectados.' -ForegroundColor Yellow
Write-Host 'Use somente em uma rede confiável: o acesso HTTP local não criptografa o tráfego.' -ForegroundColor Yellow

Write-Host 'Se o Firewall bloquear outros computadores, abra o PowerShell como administrador e execute:' -ForegroundColor Yellow
Write-Host "  New-NetFirewallRule -DisplayName 'BrewMaster LAN TCP 5180' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private" -ForegroundColor Yellow

$env:ASPNETCORE_ENVIRONMENT = 'Production'
$env:ASPNETCORE_URLS = "http://0.0.0.0:$port"
$env:Hosting__EnableHttpsRedirection = 'false'
$serverProcess = Start-Process `
    -FilePath $serverExecutable `
    -WorkingDirectory $publishDirectory `
    -PassThru

try {
    $serverReady = $false
    for ($attempt = 1; $attempt -le 40; $attempt++) {
        if ($serverProcess.HasExited) {
            throw "O servidor BrewMaster encerrou antes de ficar pronto (código $($serverProcess.ExitCode))."
        }

        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/auth" -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                $serverReady = $true
                break
            }
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }

    if (-not $serverReady) {
        throw "O servidor não respondeu em http://localhost:$port após 20 segundos."
    }

    Start-Process "http://localhost:$port"
    Write-Host 'BrewMaster está pronto. Para parar, pressione Ctrl+C nesta janela.' -ForegroundColor Green
    Wait-Process -Id $serverProcess.Id
} finally {
    if (-not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force
    }
}
