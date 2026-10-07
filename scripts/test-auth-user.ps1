param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [Parameter(Mandatory = $true)]
  [string]$ApiToken,

  [string]$Nipp = "123456",
  [string]$Nama = "Budi Santoso",
  [string]$Jabatan = "PPKA",
  [string]$Password = "rahasia123",
  [string]$SignaturePin = "123456"
)

$ErrorActionPreference = "Stop"
$endpoint = "https://$ProjectRef.functions.supabase.co/auth-user"
$headers = @{
  Authorization = "Bearer $ApiToken"
  "Content-Type" = "application/json"
}

Write-Host "Testing register ..." -ForegroundColor Cyan
$registerBody = @{
  action = "register"
  nipp = $Nipp
  nama = $Nama
  jabatan = $Jabatan
  password = $Password
  signaturePin = $SignaturePin
} | ConvertTo-Json

try {
  $registerRes = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $registerBody
  $registerRes | ConvertTo-Json -Depth 6
} catch {
  Write-Host "Register response:" -ForegroundColor Yellow
  $_.Exception.Message
}

Write-Host "Testing login ..." -ForegroundColor Cyan
$loginBody = @{
  action = "login"
  nipp = $Nipp
  password = $Password
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $loginBody
$loginRes | ConvertTo-Json -Depth 6

Write-Host "Testing verify-pin ..." -ForegroundColor Cyan
$verifyBody = @{
  action = "verify-pin"
  nipp = $Nipp
  signaturePin = $SignaturePin
} | ConvertTo-Json

$verifyRes = Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -Body $verifyBody
$verifyRes | ConvertTo-Json -Depth 6

Write-Host "Auth endpoint tests finished." -ForegroundColor Green
