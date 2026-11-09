$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$flutterProject = Join-Path $root 'BrewMaster.Android\brewmaster_android'
$apkPath = Join-Path $flutterProject 'build\app\outputs\flutter-apk\app-release.apk'
$downloadDirectory = Join-Path $root 'BrewMaster.Web\public\BrewMaster.Android'
$portableNode = Join-Path $root '.tools\node-v24.19.0-win-x64'
$androidDirectory = Join-Path $flutterProject 'android'
$flutterFromHome = Join-Path $HOME 'flutter\bin\flutter.bat'

$flutterCommand = Get-Command flutter -ErrorAction SilentlyContinue
$flutterExecutable = if ($flutterCommand) {
    $flutterCommand.Source
} elseif (Test-Path $flutterFromHome) {
    $flutterFromHome
} else {
    throw 'Flutter não foi encontrado. Instale Flutter stable e adicione flutter\bin ao PATH.'
}

if (-not (Test-Path $androidDirectory)) {
    $scaffoldDirectory = Join-Path $env:TEMP "brewmaster-android-scaffold-$PID"
    try {
        Write-Host 'Gerando a estrutura nativa Android com Flutter...' -ForegroundColor Cyan
        & $flutterExecutable create `
            --platforms=android `
            --org br.com.brewmaster `
            --project-name brewmaster_android `
            $scaffoldDirectory
        if ($LASTEXITCODE -ne 0) {
            throw 'Falha ao gerar a estrutura Android do projeto Flutter.'
        }

        Copy-Item `
            -Path (Join-Path $scaffoldDirectory 'android') `
            -Destination $androidDirectory `
            -Recurse
        Copy-Item `
            -Path (Join-Path $scaffoldDirectory '.metadata') `
            -Destination (Join-Path $flutterProject '.metadata')

        $manifestPath = Join-Path $androidDirectory 'app\src\main\AndroidManifest.xml'
        $manifest = [System.IO.File]::ReadAllText($manifestPath)
        $manifest = [regex]::Replace(
            $manifest,
            '(<manifest\b[^>]*>)',
            '$1' + "`n    <uses-permission android:name=`"android.permission.INTERNET`" />",
            1
        )
        $manifest = [regex]::Replace(
            $manifest,
            '<application\b',
            '<application android:usesCleartextTraffic="true"',
            1
        )
        $manifest = [regex]::Replace(
            $manifest,
            'android:label="[^"]+"',
            'android:label="BrewMaster"',
            1
        )
        [System.IO.File]::WriteAllText(
            $manifestPath,
            $manifest,
            [System.Text.UTF8Encoding]::new($false)
        )
    } finally {
        if (Test-Path $scaffoldDirectory) {
            Remove-Item -Path $scaffoldDirectory -Recurse -Force
        }
    }
}

Write-Host 'Validando o projeto Flutter...' -ForegroundColor Cyan
Push-Location $flutterProject
try {
    & $flutterExecutable pub get
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao instalar dependências Flutter.'
    }

    & $flutterExecutable analyze
    if ($LASTEXITCODE -ne 0) {
        throw 'A análise estática Flutter falhou.'
    }

    & $flutterExecutable test
    if ($LASTEXITCODE -ne 0) {
        throw 'Os testes Flutter falharam.'
    }

    & $flutterExecutable build apk --release
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao compilar o APK Android.'
    }
} finally {
    Pop-Location
}

if (-not (Test-Path $apkPath)) {
    throw "O APK compilado não foi encontrado em $apkPath."
}

New-Item -ItemType Directory -Path $downloadDirectory -Force | Out-Null
Copy-Item -Path $apkPath -Destination (Join-Path $downloadDirectory 'BrewMaster.apk') -Force

$npmCommand = if (Test-Path (Join-Path $portableNode 'npm.cmd')) {
    $env:PATH = "$portableNode;$env:PATH"
    Join-Path $portableNode 'npm.cmd'
} else {
    (Get-Command npm.cmd -ErrorAction Stop).Source
}

Write-Host 'Atualizando o site com o APK e a página de download...' -ForegroundColor Cyan
& $npmCommand --prefix (Join-Path $root 'BrewMaster.Web') run build
if ($LASTEXITCODE -ne 0) {
    throw 'O APK foi compilado, mas falhou a recompilação do site.'
}

Write-Host 'APK pronto para download em BrewMaster.Web\dist\BrewMaster.Android\BrewMaster.apk.' -ForegroundColor Green
