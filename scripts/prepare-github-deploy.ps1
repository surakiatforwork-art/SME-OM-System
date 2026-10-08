$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$rootPath = $root.Path
$frontendPath = Join-Path $rootPath "frontend"
$distPath = Join-Path $frontendPath "dist"
$targetPath = [System.IO.Path]::GetFullPath((Join-Path $rootPath "github-deploy"))

if (-not $targetPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to write outside workspace: $targetPath"
}

Write-Host "Building frontend for GitHub Pages..."
$previousRouterMode = $env:VITE_ROUTER_MODE
$env:VITE_ROUTER_MODE = "hash"

try {
  Push-Location $frontendPath
  npm run build
}
finally {
  Pop-Location
  if ($null -eq $previousRouterMode) {
    Remove-Item Env:\VITE_ROUTER_MODE -ErrorAction SilentlyContinue
  }
  else {
    $env:VITE_ROUTER_MODE = $previousRouterMode
  }
}

if (-not (Test-Path -LiteralPath $distPath)) {
  throw "Frontend dist folder was not created: $distPath"
}

if (Test-Path -LiteralPath $targetPath) {
  Write-Host "Cleaning existing deploy folder..."
  Remove-Item -LiteralPath $targetPath -Recurse -Force
}

New-Item -ItemType Directory -Path $targetPath | Out-Null
Copy-Item -Path (Join-Path $distPath "*") -Destination $targetPath -Recurse -Force
Copy-Item -Path (Join-Path $targetPath "index.html") -Destination (Join-Path $targetPath "404.html") -Force
New-Item -ItemType File -Path (Join-Path $targetPath ".nojekyll") -Force | Out-Null

Write-Host ""
Write-Host "GitHub deploy files are ready:"
Write-Host $targetPath
Write-Host ""
Write-Host "Upload the contents of github-deploy to the GitHub repository used for Pages."
