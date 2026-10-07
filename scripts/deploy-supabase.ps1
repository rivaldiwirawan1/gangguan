param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [Parameter(Mandatory = $true)]
  [string]$SupabaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$ServiceRoleKey,

  [Parameter(Mandatory = $true)]
  [string]$ChecklistApiToken
)

$ErrorActionPreference = "Stop"

Write-Host "[1/4] Linking project $ProjectRef ..." -ForegroundColor Cyan
supabase link --project-ref $ProjectRef

Write-Host "[2/4] Setting function secrets ..." -ForegroundColor Cyan
supabase secrets set CHECKLIST_API_TOKEN="$ChecklistApiToken" SUPABASE_URL="$SupabaseUrl" SUPABASE_SERVICE_ROLE_KEY="$ServiceRoleKey"

Write-Host "[3/4] Deploying edge functions ..." -ForegroundColor Cyan
supabase functions deploy submit-checklist --no-verify-jwt
supabase functions deploy verify-checklist --no-verify-jwt
supabase functions deploy auth-user --no-verify-jwt

Write-Host "[4/4] Done." -ForegroundColor Green
Write-Host "Remember to run SQL from supabase/schema.sql in Supabase SQL Editor if not applied yet." -ForegroundColor Yellow
Write-Host "Endpoints:" -ForegroundColor Green
Write-Host "- https://$ProjectRef.functions.supabase.co/submit-checklist"
Write-Host "- https://$ProjectRef.functions.supabase.co/verify-checklist"
Write-Host "- https://$ProjectRef.functions.supabase.co/auth-user"
