# write-deploy.ps1
$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$repoDir = Split-Path $PSScriptRoot -Parent
$wfDir = Join-Path $repoDir '.github\workflows'
New-Item -ItemType Directory -Force -Path $wfDir | Out-Null

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

[System.IO.File]::WriteAllText((Join-Path $wfDir 'deploy.yml'), $wf, $utf8)
Write-Host "Записан: $(Join-Path $wfDir 'deploy.yml')" -ForegroundColor Green
