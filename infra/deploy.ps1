param(
  [ValidateSet('diff', 'deploy', 'destroy', 'synth')]
  [string]$Action = 'deploy',
  [string]$EnvFile = '.env.deploy.local'
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$vars = @{}

function Get-EnvValue {
  param(
    [string]$Key,
    [string]$DefaultValue = ''
  )

  if ($vars.ContainsKey($Key)) {
    return $vars[$Key]
  }

  return $DefaultValue
}

$stackName = 'Ec2DeploymentStack'
$parameterArgs = @()

if ($Action -in @('deploy', 'diff')) {
  if (-not (Test-Path $EnvFile)) {
    throw "Deployment env file not found: $EnvFile. Copy .env.deploy.example to .env.deploy.local first."
  }

  Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) {
      return
    }

    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) {
      $key = $parts[0].Trim()
      $value = $parts[1].Trim().Trim('"')
      $vars[$key] = $value
    }
  }

  foreach ($requiredKey in @('KEY_NAME', 'REPO_URL')) {
    $value = Get-EnvValue -Key $requiredKey
    if ([string]::IsNullOrWhiteSpace($value)) {
      throw "Missing required key '$requiredKey' in $EnvFile"
    }
  }

  $stackName = Get-EnvValue -Key 'STACK_NAME' -DefaultValue 'Ec2DeploymentStack'
  if ($stackName -notmatch '^[A-Za-z][A-Za-z0-9-]{0,127}$') {
    throw "Invalid STACK_NAME '$stackName'. Use 1-128 chars, start with a letter, and include only letters, numbers, or hyphens."
  }
  $parameterArgs = @(
    '--parameters', "InstanceType=$(Get-EnvValue -Key 'INSTANCE_TYPE' -DefaultValue 't3.micro')",
    '--parameters', "KeyName=$(Get-EnvValue -Key 'KEY_NAME')",
    '--parameters', "RepoUrl=$(Get-EnvValue -Key 'REPO_URL')",
    '--parameters', "RepoBranch=$(Get-EnvValue -Key 'REPO_BRANCH' -DefaultValue 'main')",
    '--parameters', "DatabaseUrl=$(Get-EnvValue -Key 'DATABASE_URL')",
    '--parameters', "JwtSecret=$(Get-EnvValue -Key 'JWT_SECRET')",
    '--parameters', "JwtExpiresIn=$(Get-EnvValue -Key 'JWT_EXPIRES_IN' -DefaultValue '15m')",
    '--parameters', "JwtRefreshSecret=$(Get-EnvValue -Key 'JWT_REFRESH_SECRET')",
    '--parameters', "JwtRefreshExpiresIn=$(Get-EnvValue -Key 'JWT_REFRESH_EXPIRES_IN' -DefaultValue '7d')",
    '--parameters', "NodeEnv=$(Get-EnvValue -Key 'NODE_ENV' -DefaultValue 'production')",
    '--parameters', "FrontendUrl=$(Get-EnvValue -Key 'FRONTEND_URL' -DefaultValue 'http://localhost:3000')",
    '--parameters', "BackendUrl=$(Get-EnvValue -Key 'BACKEND_URL' -DefaultValue 'http://localhost:4000')",
    '--parameters', "AdminIpCidr=$(Get-EnvValue -Key 'ADMIN_IP_CIDR' -DefaultValue '0.0.0.0/0')",
    '--parameters', "GroqApiKey=$(Get-EnvValue -Key 'GROQ_API_KEY')",
    '--parameters', "OpenAiApiKey=$(Get-EnvValue -Key 'OPENAI_API_KEY')",
    '--parameters', "OpenAiBaseUrl=$(Get-EnvValue -Key 'OPENAI_BASE_URL' -DefaultValue 'https://api.groq.com/openai/v1')",
    '--parameters', "OpenAiModel=$(Get-EnvValue -Key 'OPENAI_MODEL' -DefaultValue 'llama-3.3-70b-versatile')",
    '--parameters', "OpenAiSttModel=$(Get-EnvValue -Key 'OPENAI_STT_MODEL' -DefaultValue 'whisper-large-v3-turbo')",
    '--parameters', "Judge0ApiUrl=$(Get-EnvValue -Key 'JUDGE0_API_URL' -DefaultValue 'http://judge0-server:2358')",
    '--parameters', "SmtpHost=$(Get-EnvValue -Key 'SMTP_HOST' -DefaultValue 'smtp.gmail.com')",
    '--parameters', "SmtpPort=$(Get-EnvValue -Key 'SMTP_PORT' -DefaultValue '587')",
    '--parameters', "SmtpSecure=$(Get-EnvValue -Key 'SMTP_SECURE' -DefaultValue 'false')",
    '--parameters', "SmtpUser=$(Get-EnvValue -Key 'SMTP_USER')",
    '--parameters', "SmtpPass=$(Get-EnvValue -Key 'SMTP_PASS')",
    '--parameters', "SmtpFrom=$(Get-EnvValue -Key 'SMTP_FROM')",
    '--parameters', "RedisUrl=$(Get-EnvValue -Key 'REDIS_URL' -DefaultValue 'redis://redis:6379')",
    '--parameters', "CloudinaryCloudName=$(Get-EnvValue -Key 'CLOUDINARY_CLOUD_NAME')",
    '--parameters', "CloudinaryApiKey=$(Get-EnvValue -Key 'CLOUDINARY_API_KEY')",
    '--parameters', "CloudinaryApiSecret=$(Get-EnvValue -Key 'CLOUDINARY_API_SECRET')",
    '--parameters', "AzureTenantId=$(Get-EnvValue -Key 'AZURE_TENANT_ID' -DefaultValue 'placeholder-tenant-id')",
    '--parameters', "AzureClientId=$(Get-EnvValue -Key 'AZURE_CLIENT_ID' -DefaultValue 'placeholder-client-id')",
    '--parameters', "AzureClientSecret=$(Get-EnvValue -Key 'AZURE_CLIENT_SECRET' -DefaultValue 'placeholder-client-secret')",
    '--parameters', "GraphSenderEmail=$(Get-EnvValue -Key 'GRAPH_SENDER_EMAIL' -DefaultValue 'noreply@example.com')"
  )
}

$cdkArgs = @($Action, '--app', 'npx ts-node cdk-stack-ec2.ts', '--context', "stackName=$stackName", $stackName)

if ($Action -eq 'deploy') {
  $cdkArgs += @('--require-approval', 'never')
}

if ($Action -in @('deploy', 'diff')) {
  $cdkArgs += $parameterArgs
}

Write-Host "Running: npx cdk $Action $stackName"
& npx cdk @cdkArgs
