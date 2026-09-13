# Starts On the Fly locally: the backend API and the frontend dev server, from one command.
# Installs dependencies and prepares the database on first run; later runs reuse them.
#
# Usage:  .\run.ps1                     start; seeds the staged demo only when the database has no data
#         .\run.ps1 -Reset              wipe and reseed demo data first (genuine counteroffers are kept)
#         .\run.ps1 -Scenario live      seed the live-demo state instead (everything private, nothing published)
#         .\run.ps1 -Source stripe      read transactions from the Stripe sandbox instead of labeled fixtures
#         .\run.ps1 -NoBrowser          don't open the app in a browser
#
# Secrets: STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY are read from the repo-root .env at runtime and
# handed to the two server processes through their environment. Values are never printed or written to disk.
# Windows PowerShell 5.1 compatible. Stop everything with Ctrl+C.

[CmdletBinding()]
param(
    [switch]$Reset,
    [ValidateSet('staged', 'live')]
    [string]$Scenario = 'staged',
    [ValidateSet('fixture', 'stripe')]
    [string]$Source,
    [switch]$NoBrowser,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = 'Stop'
# Invoke-WebRequest's progress bar makes each health probe much slower in Windows PowerShell 5.1.
$ProgressPreference = 'SilentlyContinue'
$RepoRoot = $PSScriptRoot
$BackendDir = Join-Path $RepoRoot 'backend'
$FrontendDir = Join-Path $RepoRoot 'frontend'
$VenvDir = Join-Path $BackendDir '.venv'
$VenvPython = Join-Path $VenvDir 'Scripts\python.exe'
$LogDir = Join-Path $RepoRoot '.run-logs'

function Write-Step([string]$Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Checked([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory) {
    # Native commands don't throw on failure in PowerShell 5.1, so check the exit code explicitly.
    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "'$FilePath $($Arguments -join ' ')' failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}

function Find-Python {
    # pyproject.toml requires Python 3.12+. Try the launcher's newest install, then PATH.
    $candidates = @(@('py', '-3'), @('python'))
    foreach ($candidate in $candidates) {
        $exe = $candidate[0]
        $prefix = @($candidate | Select-Object -Skip 1)
        if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) { continue }
        # A missing or broken interpreter writes to stderr; under 'Stop' that would abort the whole script.
        # The probe avoids double quotes: Windows PowerShell 5.1 strips them from native command arguments.
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $version = & $exe @prefix -c 'import sys; print(str(sys.version_info[0]) + chr(46) + str(sys.version_info[1]))' 2>$null
            $exitCode = $LASTEXITCODE
        }
        catch {
            $version = $null
            $exitCode = 1
        }
        finally {
            $ErrorActionPreference = $previousPreference
        }
        if ($exitCode -eq 0 -and $version -and ([version]"$version" -ge [version]'3.12')) {
            return @{ Exe = $exe; Prefix = $prefix; Version = "$version" }
        }
    }
    throw 'Python 3.12 or newer is required (https://www.python.org/downloads/).'
}

function Import-RootEnv([string]$Path) {
    # Loads KEY=VALUE lines into this process only, so the servers started below inherit them.
    # Variables already set in the environment win. Returns the names loaded, never the values.
    $loaded = @()
    if (-not (Test-Path -LiteralPath $Path)) { return $loaded }
    foreach ($rawLine in Get-Content -LiteralPath $Path) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith('#')) { continue }
        if ($line.StartsWith('export ')) { $line = $line.Substring(7).TrimStart() }
        $separator = $line.IndexOf('=')
        if ($separator -lt 1) { continue }
        $name = $line.Substring(0, $separator).Trim()
        if ($name -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') { continue }
        $value = $line.Substring($separator + 1).Trim()
        $quoted = $value.Length -ge 2 -and (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))
        if ($quoted) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        else {
            # Unquoted values may carry a trailing " # comment", as in most .env dialects.
            $value = ($value -replace '\s+#.*$', '')
        }
        if ([Environment]::GetEnvironmentVariable($name, 'Process')) { continue }
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        $loaded += $name
    }
    return $loaded
}

function Test-PortFree([int]$Port) {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return -not $listener
}

function Wait-ForUrl([string]$Url, [int]$TimeoutSeconds, [System.Diagnostics.Process]$Process, [string]$Name, [string]$LogFile) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) {
            Write-Host "$Name exited early (code $($Process.ExitCode)). Last log lines:" -ForegroundColor Red
            if (Test-Path $LogFile) { Get-Content $LogFile -Tail 30 }
            throw "$Name failed to start"
        }
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) { return }
        }
        catch {
            # Not listening yet (connection refused) or still compiling; try again shortly.
        }
        Start-Sleep -Milliseconds 500
    }
    throw "$Name did not respond at $Url within $TimeoutSeconds seconds (see $LogFile)"
}

function Get-TransactionCount {
    # Asks the configured database whether demo data exists, so any DATABASE_URL works, not only the SQLite default.
    $query = 'from sqlalchemy import func, select; from app.db.session import get_session_factory; ' +
        'from app.models import Transaction; s = get_session_factory()(); ' +
        'print(s.scalar(select(func.count()).select_from(Transaction)) or 0); s.close()'
    Push-Location $BackendDir
    try {
        $output = & $VenvPython -c $query
        if ($LASTEXITCODE -ne 0) { throw 'Could not read the database to decide whether to seed demo data.' }
        return [int](@($output)[-1])
    }
    finally {
        Pop-Location
    }
}

function Stop-ProcessTree([System.Diagnostics.Process]$Process) {
    if (-not $Process -or $Process.HasExited) { return }
    # npm and uvicorn spawn children; taskkill /T takes the whole tree down. A tree that is already gone is fine.
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & taskkill.exe /PID $Process.Id /T /F 2>&1 | Out-Null
    }
    catch {
        Write-Host "Could not stop process $($Process.Id): $($_.Exception.Message)" -ForegroundColor Yellow
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
}

# --- Preflight -------------------------------------------------------------------------------
Write-Step 'Checking prerequisites'
$python = Find-Python
Write-Host "    Python $($python.Version)"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is required (https://nodejs.org/).'
}
Write-Host "    Node $(node --version)"
foreach ($port in @($BackendPort, $FrontendPort)) {
    if (-not (Test-PortFree $port)) {
        throw "Port $port is already in use. Stop whatever is listening there or pass -BackendPort/-FrontendPort."
    }
}
New-Item -ItemType Directory -Force $LogDir | Out-Null

# --- Environment -----------------------------------------------------------------------------
$loadedNames = Import-RootEnv (Join-Path $RepoRoot '.env')
if ($loadedNames.Count -gt 0) {
    Write-Host "    Loaded from .env: $($loadedNames -join ', ')"
}
# The frontend reads its publishable key under a Vite-exposed name; the root .env uses Stripe's name.
if (-not $env:VITE_STRIPE_PUBLISHABLE_KEY -and $env:STRIPE_PUBLISHABLE_KEY) {
    $env:VITE_STRIPE_PUBLISHABLE_KEY = $env:STRIPE_PUBLISHABLE_KEY
}
if (-not $env:STRIPE_SECRET_KEY -or -not $env:VITE_STRIPE_PUBLISHABLE_KEY) {
    Write-Host '    Stripe sandbox keys not found in .env: the fixture demo works, but Connect Stripe sandbox will ask for keys.' -ForegroundColor Yellow
}
if ($Source -eq 'stripe' -and -not $env:STRIPE_SECRET_KEY) {
    throw '-Source stripe needs STRIPE_SECRET_KEY in the repo-root .env or the environment.'
}
# Both servers must agree on the ports this run uses, whatever backend/.env and frontend/.env say.
$env:VITE_API_URL = "http://127.0.0.1:$BackendPort"
$env:CORS_ALLOW_ORIGINS = "http://localhost:$FrontendPort,http://127.0.0.1:$FrontendPort"

# --- Backend setup ---------------------------------------------------------------------------
if (-not (Test-Path $VenvPython)) {
    Write-Step 'Creating backend virtual environment (first run)'
    Invoke-Checked $python.Exe ($python.Prefix + @('-m', 'venv', $VenvDir)) $BackendDir
}
# Reinstall only when pyproject.toml changed since the last install.
$pyprojectHash = (Get-FileHash (Join-Path $BackendDir 'pyproject.toml')).Hash
$installStamp = Join-Path $VenvDir '.installed-pyproject-hash'
if (-not (Test-Path $installStamp) -or (Get-Content $installStamp) -ne $pyprojectHash) {
    Write-Step 'Installing backend dependencies'
    Invoke-Checked $VenvPython @('-m', 'pip', 'install', '--quiet', '--upgrade', 'pip') $BackendDir
    Invoke-Checked $VenvPython @('-m', 'pip', 'install', '--quiet', '-e', '.[dev]') $BackendDir
    Set-Content -Path $installStamp -Value $pyprojectHash -Encoding ascii
}
$backendEnv = Join-Path $BackendDir '.env'
if (-not (Test-Path $backendEnv)) {
    Write-Step 'Creating backend/.env from .env.example'
    Copy-Item (Join-Path $BackendDir '.env.example') $backendEnv
}

Write-Step 'Applying database migrations'
Invoke-Checked $VenvPython @('-m', 'alembic', 'upgrade', 'head') $BackendDir
if ($Reset -or (Get-TransactionCount) -eq 0) {
    Write-Step "Seeding the $Scenario demo scenario"
    # The seeded demo is fixture data whatever source the server reads, and the seed refuses any other source.
    $previousSource = $env:TRANSACTION_SOURCE
    $env:TRANSACTION_SOURCE = 'fixture'
    try {
        Invoke-Checked $VenvPython @('-m', 'app.cli.seed_demo', '--scenario', $Scenario) $BackendDir
    }
    finally {
        $env:TRANSACTION_SOURCE = $previousSource
    }
}
if ($Source) {
    $env:TRANSACTION_SOURCE = $Source
}

# --- Frontend setup --------------------------------------------------------------------------
$lockHash = (Get-FileHash (Join-Path $FrontendDir 'package-lock.json')).Hash
$nodeStamp = Join-Path $FrontendDir 'node_modules\.installed-lock-hash'
if (-not (Test-Path $nodeStamp) -or (Get-Content $nodeStamp) -ne $lockHash) {
    Write-Step 'Installing frontend dependencies'
    Invoke-Checked 'npm.cmd' @('ci', '--no-audit', '--no-fund') $FrontendDir
    Set-Content -Path $nodeStamp -Value $lockHash -Encoding ascii
}
$frontendEnv = Join-Path $FrontendDir '.env'
if (-not (Test-Path $frontendEnv)) {
    Copy-Item (Join-Path $FrontendDir '.env.example') $frontendEnv
}

# --- Start both servers ----------------------------------------------------------------------
$backendLog = Join-Path $LogDir 'backend.log'
$frontendLog = Join-Path $LogDir 'frontend.log'
$processes = @()
try {
    Write-Step "Starting backend on http://127.0.0.1:$BackendPort"
    $backend = Start-Process -FilePath $VenvPython `
        -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', $BackendPort) `
        -WorkingDirectory $BackendDir -NoNewWindow -PassThru `
        -RedirectStandardOutput $backendLog -RedirectStandardError "$backendLog.err"
    # Reading Handle once keeps it open; otherwise Windows PowerShell 5.1 reports an empty ExitCode later.
    $null = $backend.Handle
    $processes += $backend
    Wait-ForUrl "http://127.0.0.1:$BackendPort/health" 60 $backend 'Backend' "$backendLog.err"

    Write-Step "Starting frontend on http://localhost:$FrontendPort"
    $frontend = Start-Process -FilePath 'npm.cmd' `
        -ArgumentList @('run', 'dev', '--', '--port', $FrontendPort, '--strictPort') `
        -WorkingDirectory $FrontendDir -NoNewWindow -PassThru `
        -RedirectStandardOutput $frontendLog -RedirectStandardError "$frontendLog.err"
    $null = $frontend.Handle
    $processes += $frontend
    Wait-ForUrl "http://localhost:$FrontendPort/" 60 $frontend 'Frontend' $frontendLog

    Write-Host ''
    Write-Host "App running:  http://localhost:$FrontendPort" -ForegroundColor Green
    Write-Host "API:          http://127.0.0.1:$BackendPort  (docs at /docs)" -ForegroundColor Green
    Write-Host "Logs:         $LogDir" -ForegroundColor Green
    Write-Host 'Press Ctrl+C to stop both.'
    if (-not $NoBrowser) { Start-Process "http://localhost:$FrontendPort" }

    while ($true) {
        foreach ($process in $processes) {
            if ($process.HasExited) { throw "A server exited unexpectedly (code $($process.ExitCode)); see $LogDir" }
        }
        Start-Sleep -Seconds 2
    }
}
finally {
    Write-Step 'Stopping servers'
    foreach ($process in $processes) {
        Stop-ProcessTree $process
    }
}
