$projectPorts = @(3000, 4200)

$listeners = Get-NetTCPConnection -LocalPort $projectPorts -State Listen -ErrorAction SilentlyContinue
if (-not $listeners) {
  Write-Host "Nenhum processo escutando nas portas $($projectPorts -join ', ')."
  exit 0
}

$processIds = $listeners.OwningProcess | Sort-Object -Unique
foreach ($processId in $processIds) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  $processName = if ($process) { $process.ProcessName } else { 'desconhecido' }
  Write-Host "Encerrando $processName (PID $processId) nas portas do projeto."
  Stop-Process -Id $processId -Force -ErrorAction Stop
}
