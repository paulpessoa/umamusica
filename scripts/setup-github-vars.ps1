# Cria as GitHub Actions *Secrets* do rate limit de IA.
# (No deploy.yml estas env vars sao referenciadas como ${{ secrets.* }}.)
# Uso:
#   1) Autentique o gh uma vez:  & "$env:ProgramFiles\GitHub CLI\gh.exe" auth login
#   2) Rode este script:         pwsh -File .\scripts\setup-github-vars.ps1
#
# Obs: estes valores nao sao sensiveis (teto, precos, cambio). Estao como
# secrets apenas para bater com a config atual do repo. Se preferir usa-los
# como Variables, troque 'secret set' por 'variable set' aqui E troque
# secrets.* por vars.* no deploy.yml.

$ErrorActionPreference = "Stop"

$gh = "$env:ProgramFiles\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { $gh = "gh" }  # fallback se estiver no PATH

$repo = "paulpessoa/umamusica"

# Valores default (ajuste aqui se quiser outro teto/preco).
$vars = [ordered]@{
  RATE_LIMIT_ENABLED        = "true"
  DAILY_AI_COST_LIMIT_BRL   = "0.05"
  USD_TO_BRL                = "5.5"
  WHISPER_COST_PER_CALL_BRL = "0.001"
  GROQ_INPUT_COST_USD       = "0.05"
  GROQ_OUTPUT_COST_USD      = "0.08"
  GEMINI_INPUT_COST_USD     = "0.075"
  GEMINI_OUTPUT_COST_USD    = "0.30"
  ADMIN_EMAILS              = "paulmspessoa@gmail.com"
}

foreach ($k in $vars.Keys) {
  Write-Host "Setando secret $k"
  & $gh secret set $k --repo $repo --body $vars[$k]
}

Write-Host ""
Write-Host "Pronto. Secrets criados em: https://github.com/$repo/settings/secrets/actions"
