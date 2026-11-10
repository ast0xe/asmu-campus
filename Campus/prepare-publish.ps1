# prepare-publish.ps1 — сохраните в папку Campus и запускайте оттуда
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$campusDir = $PSScriptRoot
$repoDir   = Split-Path $campusDir -Parent

# --- .gitignore (в Campus) ---
$gi = @'
node_modules/
.next/
out/
.env
.env.local
.env*.local
schedule_*.json
schedule_*.csv
normalized/
.DS_Store
npm-debug.log*
'@
[System.IO.File]::WriteAllText((Join-Path $campusDir '.gitignore'), $gi, $utf8)
Write-Host "OK: $(Join-Path $campusDir '.gitignore')" -ForegroundColor Green

# --- workflow (в корне репозитория) ---
$wf = @'
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: Campus/package-lock.json
      - name: Install deps
        run: npm ci
        working-directory: Campus
      - name: Build
        run: npm run build:pages
        working-directory: Campus
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: Campus/out
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
'@
$wfDir = Join-Path $repoDir '.github\workflows'
New-Item -ItemType Directory -Force -Path $wfDir | Out-Null
[System.IO.File]::WriteAllText((Join-Path $wfDir 'deploy.yml'), $wf, $utf8)
Write-Host "OK: $(Join-Path $wfDir 'deploy.yml')" -ForegroundColor Green
