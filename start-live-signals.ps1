param(
  [switch]$OpenBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serveScript = Join-Path $root "serve.ps1"
$liveServerScript = Join-Path $root "server\index.js"
$nodeModulesPath = Join-Path $root "node_modules"
$pidFile = Join-Path $root ".live-signals.pid"
$url = "http://localhost:8787/"
$healthUrl = "${url}api/health"

$nodeCandidates = @(
  "C:\Program Files\nodejs\node.exe",
  "C:\Program Files (x86)\nodejs\node.exe"
)

$nodeExe = $nodeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

function Test-LiveSignalsUp {
  try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Start-LiveSignalsBackend {
  if ($nodeExe -and (Test-Path -LiteralPath $liveServerScript -PathType Leaf) -and (Test-Path -LiteralPath $nodeModulesPath -PathType Container)) {
    return Start-Process $nodeExe `
      -WindowStyle Hidden `
      -ArgumentList "`"$liveServerScript`"" `
      -WorkingDirectory $root `
      -PassThru
  }

  if (-not (Test-Path -LiteralPath $serveScript -PathType Leaf)) {
    throw "Missing serve.ps1 at $serveScript"
  }

  return Start-Process powershell.exe `
    -WindowStyle Hidden `
    -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"`"$serveScript`"" `
    -WorkingDirectory $root `
    -PassThru
}

if (-not (Test-LiveSignalsUp)) {
  $process = Start-LiveSignalsBackend

  Set-Content -LiteralPath $pidFile -Value $process.Id

  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) {
    if (Test-LiveSignalsUp) {
      break
    }
    Start-Sleep -Milliseconds 500
  }
}

if (-not (Test-LiveSignalsUp)) {
  throw "Live Signals did not become healthy at $healthUrl"
}

if ($OpenBrowser) {
  Start-Process $url
}
