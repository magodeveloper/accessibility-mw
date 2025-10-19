<#
.SYNOPSIS
    Generador seguro de JWT SecretKey y Gateway Secret para Middleware Node.js

.DESCRIPTION
    Este script genera claves criptográficamente seguras para JWT y Gateway Secret
    con diferentes niveles de complejidad y las prepara para usar en diferentes entornos.
    Adaptado específicamente para el middleware Node.js de la plataforma Accessibility.

.PARAMETER Length
    Longitud de la clave (mínimo 32, recomendado 64)

.PARAMETER Type
    Tipo de clave: Alphanumeric, Special, Base64, Hex

.PARAMETER Environment
    Entorno objetivo: Development, Production, Testing

.PARAMETER Output
    Formato de salida: Console, File, Clipboard, EnvFile, All

.PARAMETER SecretType
    Tipo de secreto a generar: JWT, Gateway, Both

.EXAMPLE
    .\Generate-JwtSecretKey.ps1
    Genera ambos secretos (JWT y Gateway) de 64 caracteres

.EXAMPLE
    .\Generate-JwtSecretKey.ps1 -Type Base64 -Output Clipboard
    Genera secretos en Base64 y los copia al portapapeles

.EXAMPLE
    .\Generate-JwtSecretKey.ps1 -Environment Development -Output EnvFile
    Genera secretos y los guarda directamente en .env.development

.EXAMPLE
    .\Generate-JwtSecretKey.ps1 -SecretType JWT -Output Console
    Genera solo el JWT secret y lo muestra en consola

.NOTES
    Versión: 1.0 - Node.js Middleware
    Compatible con: accessibility-mw (Node.js/TypeScript)
    Fecha: Octubre 2025
#>

param(
    [Parameter()]
    [ValidateRange(32, 256)]
    [int]$Length = 64,
    
    [Parameter()]
    [ValidateSet("Alphanumeric", "Special", "Base64", "Hex")]
    [string]$Type = "Base64",
    
    [Parameter()]
    [ValidateSet("Development", "Production", "Testing")]
    [string]$Environment = "Development",
    
    [Parameter()]
    [ValidateSet("Console", "File", "Clipboard", "EnvFile", "All")]
    [string]$Output = "Console",
    
    [Parameter()]
    [ValidateSet("JWT", "Gateway", "Both")]
    [string]$SecretType = "Both",
    
    [Parameter()]
    [switch]$Validate,
    
    [Parameter()]
    [switch]$ShowStatistics
)

# Configuración de colores
$ErrorActionPreference = "Stop"
$Colors = @{
    Header    = "Cyan"
    Success   = "Green"
    Warning   = "Yellow"
    Error     = "Red"
    Info      = "White"
    Highlight = "Magenta"
}

function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Header {
    param([string]$Title)
    $border = "=" * 80
    Write-Host ""
    Write-ColorMessage $border $Colors.Header
    Write-ColorMessage "  $Title" $Colors.Header
    Write-ColorMessage $border $Colors.Header
    Write-Host ""
}

function Get-Entropy {
    param([string]$Key)
    
    $charSet = @{}
    foreach ($char in $Key.ToCharArray()) {
        if ($charSet.ContainsKey($char)) {
            $charSet[$char]++
        }
        else {
            $charSet[$char] = 1
        }
    }
    
    $entropy = 0
    $length = $Key.Length
    foreach ($count in $charSet.Values) {
        $probability = $count / $length
        $entropy -= $probability * [Math]::Log($probability, 2)
    }
    
    return [Math]::Round($entropy, 2)
}

function Test-KeyStrength {
    param([string]$Key)
    
    $length = $Key.Length
    $hasLower = $Key -cmatch '[a-z]'
    $hasUpper = $Key -cmatch '[A-Z]'
    $hasDigit = $Key -cmatch '\d'
    $hasSpecial = $Key -match '[^a-zA-Z0-9]'
    $entropy = Get-Entropy -Key $Key
    
    $score = 0
    $score += if ($length -ge 32) { 20 } else { 0 }
    $score += if ($length -ge 64) { 10 } else { 0 }
    $score += if ($hasLower) { 15 } else { 0 }
    $score += if ($hasUpper) { 15 } else { 0 }
    $score += if ($hasDigit) { 15 } else { 0 }
    $score += if ($hasSpecial) { 25 } else { 0 }
    
    $strength = switch ($score) {
        { $_ -ge 90 } { "Excelente" }
        { $_ -ge 70 } { "Muy Buena" }
        { $_ -ge 50 } { "Buena" }
        { $_ -ge 30 } { "Regular" }
        default { "Débil" }
    }
    
    return [PSCustomObject]@{
        Length       = $length
        HasLowercase = $hasLower
        HasUppercase = $hasUpper
        HasDigits    = $hasDigit
        HasSpecial   = $hasSpecial
        Entropy      = $entropy
        Score        = $score
        Strength     = $strength
        IsValid      = $length -ge 32
    }
}

function New-SecretKey {
    param(
        [int]$Length,
        [string]$Type
    )
    
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    
    switch ($Type) {
        "Alphanumeric" {
            $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
            $bytes = New-Object byte[] $Length
            $rng.GetBytes($bytes)
            
            $key = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
            return $key
        }
        
        "Special" {
            $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
            $bytes = New-Object byte[] $Length
            $rng.GetBytes($bytes)
            
            $key = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
            return $key
        }
        
        "Base64" {
            $bytes = New-Object byte[] ($Length * 3 / 4)
            $rng.GetBytes($bytes)
            $key = [Convert]::ToBase64String($bytes)
            return $key.Substring(0, [Math]::Min($Length, $key.Length))
        }
        
        "Hex" {
            $bytes = New-Object byte[] ($Length / 2)
            $rng.GetBytes($bytes)
            $key = -join ($bytes | ForEach-Object { $_.ToString("x2") })
            return $key.Substring(0, [Math]::Min($Length, $key.Length))
        }
    }
    
    $rng.Dispose()
}

function Write-KeyInfo {
    param(
        [string]$KeyName,
        [string]$Key,
        [object]$Stats
    )
    
    Write-ColorMessage "`n🔑 $KeyName" $Colors.Highlight
    Write-ColorMessage ("=" * 80) $Colors.Info
    Write-ColorMessage "Clave: $Key" $Colors.Success
    Write-Host ""
    Write-ColorMessage "📊 Estadísticas:" $Colors.Info
    Write-Host "   Longitud:      $($Stats.Length) caracteres"
    Write-Host "   Minúsculas:    $(if ($Stats.HasLowercase) { '✅' } else { '❌' })"
    Write-Host "   Mayúsculas:    $(if ($Stats.HasUppercase) { '✅' } else { '❌' })"
    Write-Host "   Dígitos:       $(if ($Stats.HasDigits) { '✅' } else { '❌' })"
    Write-Host "   Especiales:    $(if ($Stats.HasSpecial) { '✅' } else { '❌' })"
    Write-Host "   Entropía:      $($Stats.Entropy) bits/carácter"
    Write-Host "   Puntuación:    $($Stats.Score)/100"
    Write-ColorMessage "   Fortaleza:     $($Stats.Strength)" $(
        if ($Stats.Strength -eq "Excelente") { $Colors.Success }
        elseif ($Stats.Strength -in @("Muy Buena", "Buena")) { $Colors.Warning }
        else { $Colors.Error }
    )
    Write-Host ""
}

function Save-ToEnvFile {
    param(
        [string]$JwtKey,
        [string]$GatewayKey,
        [string]$Environment
    )
    
    $envFile = ".env.$($Environment.ToLower())"
    
    if (-not (Test-Path $envFile)) {
        Write-ColorMessage "⚠️  El archivo $envFile no existe. Créalo primero desde .env.template" $Colors.Warning
        return $false
    }
    
    # Leer contenido actual
    $content = Get-Content $envFile -Raw
    
    # Actualizar JWT_SECRET_KEY
    if ($JwtKey) {
        if ($content -match 'JWT_SECRET_KEY=.*') {
            $content = $content -replace 'JWT_SECRET_KEY=.*', "JWT_SECRET_KEY=$JwtKey"
            Write-ColorMessage "✅ JWT_SECRET_KEY actualizado en $envFile" $Colors.Success
        } else {
            $content += "`nJWT_SECRET_KEY=$JwtKey"
            Write-ColorMessage "✅ JWT_SECRET_KEY añadido a $envFile" $Colors.Success
        }
    }
    
    # Actualizar GATEWAY_SECRET
    if ($GatewayKey) {
        if ($content -match 'GATEWAY_SECRET=.*') {
            $content = $content -replace 'GATEWAY_SECRET=.*', "GATEWAY_SECRET=$GatewayKey"
            Write-ColorMessage "✅ GATEWAY_SECRET actualizado en $envFile" $Colors.Success
        } else {
            $content += "`nGATEWAY_SECRET=$GatewayKey"
            Write-ColorMessage "✅ GATEWAY_SECRET añadido a $envFile" $Colors.Success
        }
    }
    
    # Guardar archivo
    Set-Content -Path $envFile -Value $content -NoNewline
    
    return $true
}

function Save-ToFile {
    param(
        [string]$JwtKey,
        [string]$GatewayKey,
        [string]$Environment
    )
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $filename = "secrets-$Environment-$timestamp.txt"
    
    $content = @"
╔════════════════════════════════════════════════════════════════════════════╗
║                     SECRETS GENERADOS - MIDDLEWARE NODE.JS                 ║
║                     Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")                            ║
╚════════════════════════════════════════════════════════════════════════════╝

AMBIENTE: $Environment
TIPO: $Type
LONGITUD: $Length caracteres

$(if ($JwtKey) { @"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 JWT SECRET KEY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JWT_SECRET_KEY=$JwtKey

Usar en .env.$($Environment.ToLower()):
JWT_SECRET_KEY=$JwtKey

"@ } else { "" })
$(if ($GatewayKey) { @"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 GATEWAY SECRET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GATEWAY_SECRET=$GatewayKey

Usar en .env.$($Environment.ToLower()):
GATEWAY_SECRET=$GatewayKey

"@ } else { "" })
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  IMPORTANTE - SEGURIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. NO commitear este archivo al repositorio
2. Guardar en un lugar seguro (gestor de contraseñas)
3. Compartir solo por canales seguros (nunca por email/chat)
4. Usar diferentes secretos por ambiente (dev/prod)
5. Rotar secretos periódicamente
6. Eliminar este archivo después de configurar el ambiente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 CONFIGURACIÓN EN .env.$($Environment.ToLower())
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Copia .env.template a .env.$($Environment.ToLower())
2. Reemplaza los valores de JWT_SECRET_KEY y GATEWAY_SECRET
3. Verifica que .env.$($Environment.ToLower()) esté en .gitignore
4. Ejecuta: npm run dev (development) o npm start (production)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"@
    
    Set-Content -Path $filename -Value $content
    Write-ColorMessage "`n💾 Secretos guardados en: $filename" $Colors.Success
    Write-ColorMessage "   ⚠️  Recuerda eliminar este archivo después de usarlo" $Colors.Warning
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

Write-Header "🔐 Generador de Secrets - Accessibility Middleware"

Write-ColorMessage "⚙️  Configuración:" $Colors.Info
Write-Host "   Tipo:       $Type"
Write-Host "   Longitud:   $Length caracteres"
Write-Host "   Ambiente:   $Environment"
Write-Host "   Salida:     $Output"
Write-Host "   Secretos:   $SecretType"
Write-Host ""

# Generar secretos
$jwtKey = $null
$gatewayKey = $null

if ($SecretType -in @("JWT", "Both")) {
    Write-ColorMessage "🔄 Generando JWT Secret Key..." $Colors.Info
    $jwtKey = New-SecretKey -Length $Length -Type $Type
}

if ($SecretType -in @("Gateway", "Both")) {
    Write-ColorMessage "🔄 Generando Gateway Secret..." $Colors.Info
    $gatewayKey = New-SecretKey -Length $Length -Type $Type
}

# Mostrar información
if ($jwtKey) {
    $jwtStats = Test-KeyStrength -Key $jwtKey
    Write-KeyInfo -KeyName "JWT_SECRET_KEY" -Key $jwtKey -Stats $jwtStats
}

if ($gatewayKey) {
    $gatewayStats = Test-KeyStrength -Key $gatewayKey
    Write-KeyInfo -KeyName "GATEWAY_SECRET" -Key $gatewayKey -Stats $gatewayStats
}

# Validación
if ($Validate) {
    Write-Header "🔍 Validación de Seguridad"
    
    $allValid = $true
    
    if ($jwtKey) {
        $jwtStats = Test-KeyStrength -Key $jwtKey
        if (-not $jwtStats.IsValid) {
            Write-ColorMessage "❌ JWT_SECRET_KEY: Longitud mínima no cumplida (32 caracteres)" $Colors.Error
            $allValid = $false
        } else {
            Write-ColorMessage "✅ JWT_SECRET_KEY: Validación exitosa" $Colors.Success
        }
    }
    
    if ($gatewayKey) {
        $gatewayStats = Test-KeyStrength -Key $gatewayKey
        if (-not $gatewayStats.IsValid) {
            Write-ColorMessage "❌ GATEWAY_SECRET: Longitud mínima no cumplida (32 caracteres)" $Colors.Error
            $allValid = $false
        } else {
            Write-ColorMessage "✅ GATEWAY_SECRET: Validación exitosa" $Colors.Success
        }
    }
    
    Write-Host ""
    if ($allValid) {
        Write-ColorMessage "✅ Todas las validaciones pasaron correctamente" $Colors.Success
    } else {
        Write-ColorMessage "❌ Algunas validaciones fallaron" $Colors.Error
        exit 1
    }
}

# Salida
Write-Header "📤 Guardando Secretos"

switch ($Output) {
    "Console" {
        Write-ColorMessage "✅ Secretos mostrados en consola" $Colors.Success
    }
    
    "File" {
        Save-ToFile -JwtKey $jwtKey -GatewayKey $gatewayKey -Environment $Environment
    }
    
    "Clipboard" {
        $clipboardContent = ""
        if ($jwtKey) { $clipboardContent += "JWT_SECRET_KEY=$jwtKey`n" }
        if ($gatewayKey) { $clipboardContent += "GATEWAY_SECRET=$gatewayKey" }
        
        Set-Clipboard -Value $clipboardContent
        Write-ColorMessage "✅ Secretos copiados al portapapeles" $Colors.Success
    }
    
    "EnvFile" {
        $success = Save-ToEnvFile -JwtKey $jwtKey -GatewayKey $gatewayKey -Environment $Environment
        if (-not $success) {
            Write-ColorMessage "`n💡 Tip: Primero crea el archivo desde la plantilla:" $Colors.Info
            Write-ColorMessage "   Copy-Item .env.template .env.$($Environment.ToLower())" $Colors.Info
        }
    }
    
    "All" {
        Save-ToFile -JwtKey $jwtKey -GatewayKey $gatewayKey -Environment $Environment
        
        $clipboardContent = ""
        if ($jwtKey) { $clipboardContent += "JWT_SECRET_KEY=$jwtKey`n" }
        if ($gatewayKey) { $clipboardContent += "GATEWAY_SECRET=$gatewayKey" }
        Set-Clipboard -Value $clipboardContent
        Write-ColorMessage "✅ Secretos copiados al portapapeles" $Colors.Success
        
        $success = Save-ToEnvFile -JwtKey $jwtKey -GatewayKey $gatewayKey -Environment $Environment
    }
}

# Instrucciones finales
Write-Header "📋 Próximos Pasos"

Write-ColorMessage "1️⃣  Configurar archivo de ambiente:" $Colors.Info
Write-Host "   Copy-Item .env.template .env.$($Environment.ToLower())"
Write-Host ""

Write-ColorMessage "2️⃣  Actualizar variables en .env.$($Environment.ToLower()):" $Colors.Info
if ($jwtKey) {
    Write-Host "   JWT_SECRET_KEY=$jwtKey"
}
if ($gatewayKey) {
    Write-Host "   GATEWAY_SECRET=$gatewayKey"
}
Write-Host ""

Write-ColorMessage "3️⃣  Validar configuración JWT:" $Colors.Info
Write-Host "   .\Validate-JwtConfig.ps1 -Environment $Environment"
Write-Host ""

Write-ColorMessage "4️⃣  Iniciar servidor:" $Colors.Info
if ($Environment -eq "Development") {
    Write-Host "   npm run dev"
} else {
    Write-Host "   npm run build && npm start"
}
Write-Host ""

Write-ColorMessage "⚠️  RECORDATORIOS DE SEGURIDAD:" $Colors.Warning
Write-Host "   • NO commitear archivos .env.* al repositorio"
Write-Host "   • Usar secretos diferentes para dev/prod"
Write-Host "   • Rotar secretos periódicamente"
Write-Host "   • Guardar secretos en gestor de contraseñas"
Write-Host "   • Compartir solo por canales seguros"
Write-Host ""

Write-ColorMessage "✅ Proceso completado exitosamente!" $Colors.Success
Write-Host ""
