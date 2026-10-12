# 1. Admin login to dynamically discover workspace IDs
$adminBody = @{ email = 'admin@jd-services.fr'; password = 'Password123!' } | ConvertTo-Json
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminLogin = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method POST -Body $adminBody -ContentType 'application/json' -WebSession $adminSession
Write-Host "1. Admin logged in: $($adminLogin.user.email) (Role: $($adminLogin.user.role))"

$usersRes = Invoke-RestMethod -Uri 'http://localhost:3000/api/users' -Method GET -WebSession $adminSession
Write-Host "2. Admin fetched users count: $($usersRes.users.Count)"

$autoUser = $usersRes.users | Where-Object { $_.email -eq 'commercial.auto@jd-services.fr' }
$autoWsId = $autoUser.workspaceUsers[0].workspace.id

$networkUser = $usersRes.users | Where-Object { $_.email -eq 'tech.network@jd-services.fr' }
$networkWsId = $networkUser.workspaceUsers[0].workspace.id

Write-Host "Discovered Automobile Workspace ID: $autoWsId"
Write-Host "Discovered Network Workspace ID:    $networkWsId"

$hasHash = $usersRes.users | Where-Object { $_.PSObject.Properties['passwordHash'] -ne $null }
Write-Host "3. Any passwordHash exposed in users API: $($hasHash.Count -gt 0)"

# 4. Commercial Auto login:
$autoLoginBody = @{ email = 'commercial.auto@jd-services.fr'; password = 'Password123!' } | ConvertTo-Json
$commSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$commLogin = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method POST -Body $autoLoginBody -ContentType 'application/json' -WebSession $commSession
Write-Host "4. Commercial Auto logged in: $($commLogin.user.email) (Role: $($commLogin.user.role))"

# 5. Fetch Auto workspace clients with Commercial Auto (SHOULD SUCCEED):
$autoClients = Invoke-RestMethod -Uri "http://localhost:3000/api/clients?workspaceId=$autoWsId" -Method GET -WebSession $commSession
Write-Host "5. Auto clients successfully retrieved: $($autoClients.clients.Count) clients found"

# 6. Try to fetch Network workspace clients with Commercial Auto (SHOULD BE BLOCKED 403):
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/clients?workspaceId=$networkWsId" -Method GET -WebSession $commSession
  Write-Host "ERROR: Network access should have been forbidden!"
} catch {
  Write-Host "6. Cross-workspace access correctly blocked with HTTP $($_.Exception.Response.StatusCode.value__)"
}

# 7. Try to access users API with Commercial Auto (SHOULD BE BLOCKED 403):
try {
  Invoke-RestMethod -Uri 'http://localhost:3000/api/users' -Method GET -WebSession $commSession
  Write-Host "ERROR: Users API should have been forbidden!"
} catch {
  Write-Host "7. Non-admin access to users API correctly blocked with HTTP $($_.Exception.Response.StatusCode.value__)"
}

# 8. Check bad login rate limiting:
Write-Host "8. Testing rate limiting on 6 consecutive bad login attempts:"
$badBody = @{ email = 'test_rate_limit_demo@jd-services.fr'; password = 'wrong_password' } | ConvertTo-Json
1..6 | ForEach-Object {
  try {
    Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method POST -Body $badBody -ContentType 'application/json'
    Write-Host "Attempt $_ succeeded unexpectedly"
  } catch {
    Write-Host "Attempt $_ rejected with HTTP $($_.Exception.Response.StatusCode.value__)"
  }
}
