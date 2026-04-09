Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $root ".live-signals.pid"

$stoppedAny = $false

if (Test-Path -LiteralPath $pidFile -PathType Leaf) {
  $pidText = (Get-Content -LiteralPath $pidFile -Raw).Trim()
  if ($pidText -match '^\d+$') {
    $process = Get-Process -Id ([int]$pidText) -ErrorAction SilentlyContinue
    if ($process) {
      Stop-Process -Id $process.Id -Force
      $stoppedAny = $true
    }
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

$serveProcesses = Get-CimInstance Win32_Process |
  Where-Object {
    (
      $_.Name -match '^powershell(\.exe)?$' -and
      $_.CommandLine -like '*serve.ps1*'
    ) -or (
      $_.Name -match '^node(\.exe)?$' -and
      $_.CommandLine -like '*server\index.js*'
    )
  }

foreach ($process in $serveProcesses) {
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  $stoppedAny = $true
}

if ($stoppedAny) {
  Write-Host "Live Signals stopped."
} else {
  Write-Host "No running Live Signals process found."
}
