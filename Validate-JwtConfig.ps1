#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Valida la configuración JWT entre el Middleware Node.js y el Gateway .NET

.DESCRIPTION
    Este script verifica que los valores de JWT (SecretKey, Issuer, Audience) y Gateway Secret
    estén sincronizados correctamente entre el middleware Node.js y el Gateway de la plataforma.

.PARAMETER MiddlewarePath
    Ruta al directorio del middleware (ej: c:\Git\accessibility-mw)
    Si no se especifica, usa el directorio actual

.PARAMETER GatewayPath
    Ruta al directorio del Gateway (ej: c:\Git\accessibility-gw)
    Por defecto busca en el directorio padre

.PARAMETER Environment
    Entorno a validar: Development, Production
    Por defecto: Development

.PARAMETER CheckGatewaySecret
    Valida también el GATEWAY_SECRET compartido
    Por defecto: true

.EXAMPLE
    .\Validate-JwtConfig.ps1
    Ejecuta la validación detectando automáticamente las rutas

.EXAMPLE
    .\Validate-JwtConfig.ps1 -Environment Production
    Valida la configuración de producción

.EXAMPLE
    .\Validate-JwtConfig.ps1 -MiddlewarePath "c:\Git\accessibility-mw" -GatewayPath "c:\Git\accessibility-gw"
    Valida con rutas personalizadas

.EXAMPLE
    .\Validate-JwtConfig.ps1 -CheckGatewaySecret:$false
    Valida solo JWT sin verificar Gateway Secret

.NOTES
    Versión: 1.0 - Node.js Middleware
    Autor: Accessibility Team
    Compatible con: accessibility-mw (Node.js) y accessibility-gw (.NET)
    Fecha: Octubre 2025
#>

param(
    [Parameter()]
    [string]$MiddlewarePath = "",
    
    [Parameter()]
    [string]$GatewayPath = "",
    
    [Parameter()]
    [ValidateSet("Development", "Production")]
    [string]$Environment = "Development",
    
    [Parameter()]
    [bool]$CheckGatewaySecret = $true
)

# Colores para output
$ErrorColor = "Red"
$SuccessColor = "Green"
$WarningColor = "Yellow"
$InfoColor = "Cyan"
$DetailColor = "Gray"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor $InfoColor
Write-Host "║       JWT Configuration Validator v1.0                    ║" -ForegroundColor $InfoColor
Write-Host "║       Middleware Node.js ↔ Gateway .NET                  ║" -ForegroundColor $InfoColor
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor $InfoColor
Write-Host ""

# Auto-detectar rutas si no se especificaron
if ([string]::IsNullOrWhiteSpace($MiddlewarePath)) {
    $MiddlewarePath = Get-Location
    Write-Host "🔍 Usando directorio actual: $MiddlewarePath" -ForegroundColor $InfoColor
}

# Auto-detectar Gateway si no se especificó
if ([string]::IsNullOrWhiteSpace($GatewayPath)) {
    $parentDir = Split-Path $MiddlewarePath -Parent
    if ($parentDir) {
        $possibleGatewayPaths = @(
            (Join-Path $parentDir "accessibility-gw"),
            "c:\Git\accessibility-gw",
            "..\accessibility-gw"
        )
        
        foreach ($path in $possibleGatewayPaths) {
            if (Test-Path $path) {
                $GatewayPath = $path
                Write-Host "🔍 Gateway detectado: $GatewayPath" -ForegroundColor $InfoColor
                break
            }
        }
    }
    
    if ([string]::IsNullOrWhiteSpace($GatewayPath)) {
        Write-Host "⚠️  No se pudo detectar el Gateway automáticamente" -ForegroundColor $WarningColor
        Write-Host "   Usa: -GatewayPath 'c:\ruta\al\gateway'" -ForegroundColor $WarningColor
        exit 1
    }
}

Write-Host "📋 Ambiente: $Environment" -ForegroundColor $InfoColor
Write-Host ""

# Rutas de configuración
$middlewareEnvFile = Join-Path $MiddlewarePath ".env.$($Environment.ToLower())"
$gatewayProjectPath = Join-Path $GatewayPath "src" "Gateway"
$gatewayAppSettingsPath = if ($Environment -eq "Development") {
    Join-Path $gatewayProjectPath "appsettings.Development.json"
} else {
    Join-Path $gatewayProjectPath "appsettings.Production.json"
}

# Verificar que existan los directorios
if (-not (Test-Path $MiddlewarePath)) {
    Write-Host "❌ ERROR: No se encontró el Middleware en: $MiddlewarePath" -ForegroundColor $ErrorColor
    exit 1
}

if (-not (Test-Path $GatewayPath)) {
    Write-Host "❌ ERROR: No se encontró el Gateway en: $GatewayPath" -ForegroundColor $ErrorColor
    exit 1
}

# ============================================================================
# 1. VALIDAR MIDDLEWARE NODE.JS
# ============================================================================
Write-Host "┌───────────────────────────────────────────────────────────┐" -ForegroundColor $InfoColor
Write-Host "│ 1️⃣  Middleware Node.js                                    │" -ForegroundColor $InfoColor
Write-Host "└───────────────────────────────────────────────────────────┘" -ForegroundColor $InfoColor
Write-Host ""

# Leer archivo .env
if (-not (Test-Path $middlewareEnvFile)) {
    Write-Host "   ❌ ERROR: No existe el archivo $middlewareEnvFile" -ForegroundColor $ErrorColor
    Write-Host "      Crea el archivo desde .env.template:" -ForegroundColor $DetailColor
    Write-Host "      Copy-Item .env.template $middlewareEnvFile" -ForegroundColor $DetailColor
    exit 1
}

# Parsear archivo .env
$middlewareConfig = @{}
Get-Content $middlewareEnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        if ($line -match "^([^=]+)=(.*)$") {
            $key = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            $middlewareConfig[$key] = $value
        }
    }
}

# Extraer configuración JWT del middleware
$mwJwtSecretKey = $middlewareConfig["JWT_SECRET_KEY"]
$mwJwtIssuer = $middlewareConfig["JWT_ISSUER"]
$mwJwtAudience = $middlewareConfig["JWT_AUDIENCE"]
$mwJwtExpiryHours = $middlewareConfig["JWT_EXPIRY_HOURS"]
$mwGatewaySecret = $middlewareConfig["GATEWAY_SECRET"]

# Validar que existan los valores
$middlewareValid = $true

if ([string]::IsNullOrWhiteSpace($mwJwtSecretKey) -or $mwJwtSecretKey -like "*CHANGE_THIS*") {
    Write-Host "   ❌ JWT_SECRET_KEY no configurado o usa valor por defecto" -ForegroundColor $ErrorColor
    $middlewareValid = $false
} else {
    Write-Host "   ✅ JWT_SECRET_KEY configurado" -ForegroundColor $SuccessColor
    Write-Host "      Longitud: $($mwJwtSecretKey.Length) caracteres" -ForegroundColor $DetailColor
    
    if ($mwJwtSecretKey.Length -lt 32) {
        Write-Host "      ⚠️  Longitud menor a 32 caracteres (no seguro)" -ForegroundColor $WarningColor
    } elseif ($mwJwtSecretKey.Length -lt 64) {
        Write-Host "      ⚠️  Se recomienda al menos 64 caracteres" -ForegroundColor $WarningColor
    }
}

if ([string]::IsNullOrWhiteSpace($mwJwtIssuer)) {
    Write-Host "   ⚠️  JWT_ISSUER no configurado" -ForegroundColor $WarningColor
} else {
    Write-Host "   ✅ JWT_ISSUER: $mwJwtIssuer" -ForegroundColor $SuccessColor
}

if ([string]::IsNullOrWhiteSpace($mwJwtAudience)) {
    Write-Host "   ⚠️  JWT_AUDIENCE no configurado" -ForegroundColor $WarningColor
} else {
    Write-Host "   ✅ JWT_AUDIENCE: $mwJwtAudience" -ForegroundColor $SuccessColor
}

if ([string]::IsNullOrWhiteSpace($mwJwtExpiryHours)) {
    Write-Host "   ⚠️  JWT_EXPIRY_HOURS no configurado" -ForegroundColor $WarningColor
} else {
    Write-Host "   ✅ JWT_EXPIRY_HOURS: $mwJwtExpiryHours horas" -ForegroundColor $SuccessColor
}

if ($CheckGatewaySecret) {
    if ([string]::IsNullOrWhiteSpace($mwGatewaySecret) -or $mwGatewaySecret -like "*CHANGE_THIS*") {
        Write-Host "   ❌ GATEWAY_SECRET no configurado o usa valor por defecto" -ForegroundColor $ErrorColor
        $middlewareValid = $false
    } else {
        Write-Host "   ✅ GATEWAY_SECRET configurado" -ForegroundColor $SuccessColor
        Write-Host "      Longitud: $($mwGatewaySecret.Length) caracteres" -ForegroundColor $DetailColor
        
        if ($mwGatewaySecret.Length -lt 32) {
            Write-Host "      ⚠️  Longitud menor a 32 caracteres (no seguro)" -ForegroundColor $WarningColor
        }
    }
}

Write-Host ""

# ============================================================================
# 2. VALIDAR GATEWAY .NET
# ============================================================================
Write-Host "┌───────────────────────────────────────────────────────────┐" -ForegroundColor $InfoColor
Write-Host "│ 2️⃣  Gateway .NET                                          │" -ForegroundColor $InfoColor
Write-Host "└───────────────────────────────────────────────────────────┘" -ForegroundColor $InfoColor
Write-Host ""

# Verificar que exista el Gateway
if (-not (Test-Path $gatewayProjectPath)) {
    Write-Host "   ❌ ERROR: No se encontró el proyecto Gateway en: $gatewayProjectPath" -ForegroundColor $ErrorColor
    exit 1
}

# Leer appsettings del Gateway
if (-not (Test-Path $gatewayAppSettingsPath)) {
    Write-Host "   ❌ ERROR: No existe $gatewayAppSettingsPath" -ForegroundColor $ErrorColor
    exit 1
}

$gatewayAppSettings = Get-Content $gatewayAppSettingsPath -Raw | ConvertFrom-Json

# Extraer configuración JWT del Gateway
$gwJwtIssuer = $gatewayAppSettings.JwtSettings.Issuer
$gwJwtAudience = $gatewayAppSettings.JwtSettings.Audience
$gwJwtExpiryHours = $gatewayAppSettings.JwtSettings.ExpiryHours

# Leer SecretKey de User Secrets
Push-Location $gatewayProjectPath
try {
    $gatewaySecrets = dotnet user-secrets list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️  User Secrets no inicializados en Gateway" -ForegroundColor $WarningColor
        $gwJwtSecretKey = $null
        $gwGatewaySecret = $null
    } else {
        # Buscar JWT SecretKey
        $jwtSecretLine = $gatewaySecrets | Select-String "JwtSettings:SecretKey"
        if ($jwtSecretLine) {
            $gwJwtSecretKey = ($jwtSecretLine -split " = ")[1].Trim()
            Write-Host "   ✅ JWT SecretKey configurado en User Secrets" -ForegroundColor $SuccessColor
            Write-Host "      Longitud: $($gwJwtSecretKey.Length) caracteres" -ForegroundColor $DetailColor
        } else {
            Write-Host "   ❌ JWT SecretKey NO encontrado en User Secrets" -ForegroundColor $ErrorColor
            $gwJwtSecretKey = $null
        }
        
        # Buscar Gateway Secret
        if ($CheckGatewaySecret) {
            $gatewaySecretLine = $gatewaySecrets | Select-String "GatewaySecret"
            if ($gatewaySecretLine) {
                $gwGatewaySecret = ($gatewaySecretLine -split " = ")[1].Trim()
                Write-Host "   ✅ Gateway Secret configurado en User Secrets" -ForegroundColor $SuccessColor
                Write-Host "      Longitud: $($gwGatewaySecret.Length) caracteres" -ForegroundColor $DetailColor
            } else {
                Write-Host "   ❌ Gateway Secret NO encontrado en User Secrets" -ForegroundColor $ErrorColor
                $gwGatewaySecret = $null
            }
        }
    }
} catch {
    Write-Host "   ❌ Error al leer User Secrets: $_" -ForegroundColor $ErrorColor
    $gwJwtSecretKey = $null
    $gwGatewaySecret = $null
} finally {
    Pop-Location
}

Write-Host "   Issuer:       $gwJwtIssuer" -ForegroundColor $DetailColor
Write-Host "   Audience:     $gwJwtAudience" -ForegroundColor $DetailColor
Write-Host "   ExpiryHours:  $gwJwtExpiryHours" -ForegroundColor $DetailColor

Write-Host ""

# ============================================================================
# 3. COMPARAR CONFIGURACIONES
# ============================================================================
Write-Host "┌───────────────────────────────────────────────────────────┐" -ForegroundColor $InfoColor
Write-Host "│ 3️⃣  Comparación de Configuraciones                        │" -ForegroundColor $InfoColor
Write-Host "└───────────────────────────────────────────────────────────┘" -ForegroundColor $InfoColor
Write-Host ""

$allValid = $true

# Comparar JWT SecretKey
Write-Host "🔑 JWT_SECRET_KEY:" -ForegroundColor $InfoColor
if ([string]::IsNullOrWhiteSpace($mwJwtSecretKey) -or [string]::IsNullOrWhiteSpace($gwJwtSecretKey)) {
    Write-Host "   ❌ No se puede comparar: uno o ambos valores no configurados" -ForegroundColor $ErrorColor
    $allValid = $false
} elseif ($mwJwtSecretKey -eq $gwJwtSecretKey) {
    Write-Host "   ✅ COINCIDEN - Middleware y Gateway usan el mismo SecretKey" -ForegroundColor $SuccessColor
} else {
    Write-Host "   ❌ NO COINCIDEN - Los SecretKeys son diferentes" -ForegroundColor $ErrorColor
    Write-Host "      Middleware: $($mwJwtSecretKey.Substring(0, [Math]::Min(20, $mwJwtSecretKey.Length)))..." -ForegroundColor $DetailColor
    Write-Host "      Gateway:    $($gwJwtSecretKey.Substring(0, [Math]::Min(20, $gwJwtSecretKey.Length)))..." -ForegroundColor $DetailColor
    $allValid = $false
}
Write-Host ""

# Comparar JWT Issuer
Write-Host "🏢 JWT_ISSUER:" -ForegroundColor $InfoColor
if ($mwJwtIssuer -eq $gwJwtIssuer) {
    Write-Host "   ✅ COINCIDEN: $mwJwtIssuer" -ForegroundColor $SuccessColor
} else {
    Write-Host "   ⚠️  NO COINCIDEN (puede ser intencional):" -ForegroundColor $WarningColor
    Write-Host "      Middleware: $mwJwtIssuer" -ForegroundColor $DetailColor
    Write-Host "      Gateway:    $gwJwtIssuer" -ForegroundColor $DetailColor
}
Write-Host ""

# Comparar JWT Audience
Write-Host "👥 JWT_AUDIENCE:" -ForegroundColor $InfoColor
if ($mwJwtAudience -eq $gwJwtAudience) {
    Write-Host "   ✅ COINCIDEN: $mwJwtAudience" -ForegroundColor $SuccessColor
} else {
    Write-Host "   ⚠️  NO COINCIDEN (puede ser intencional):" -ForegroundColor $WarningColor
    Write-Host "      Middleware: $mwJwtAudience" -ForegroundColor $DetailColor
    Write-Host "      Gateway:    $gwJwtAudience" -ForegroundColor $DetailColor
}
Write-Host ""

# Comparar ExpiryHours
Write-Host "⏱️  JWT_EXPIRY_HOURS:" -ForegroundColor $InfoColor
if ($mwJwtExpiryHours -eq $gwJwtExpiryHours) {
    Write-Host "   ✅ COINCIDEN: $mwJwtExpiryHours horas" -ForegroundColor $SuccessColor
} else {
    Write-Host "   ⚠️  NO COINCIDEN:" -ForegroundColor $WarningColor
    Write-Host "      Middleware: $mwJwtExpiryHours horas" -ForegroundColor $DetailColor
    Write-Host "      Gateway:    $gwJwtExpiryHours horas" -ForegroundColor $DetailColor
}
Write-Host ""

# Comparar Gateway Secret
if ($CheckGatewaySecret) {
    Write-Host "🔐 GATEWAY_SECRET:" -ForegroundColor $InfoColor
    if ([string]::IsNullOrWhiteSpace($mwGatewaySecret) -or [string]::IsNullOrWhiteSpace($gwGatewaySecret)) {
        Write-Host "   ❌ No se puede comparar: uno o ambos valores no configurados" -ForegroundColor $ErrorColor
        $allValid = $false
    } elseif ($mwGatewaySecret -eq $gwGatewaySecret) {
        Write-Host "   ✅ COINCIDEN - Middleware y Gateway usan el mismo Gateway Secret" -ForegroundColor $SuccessColor
    } else {
        Write-Host "   ❌ NO COINCIDEN - Los Gateway Secrets son diferentes" -ForegroundColor $ErrorColor
        Write-Host "      Middleware: $($mwGatewaySecret.Substring(0, [Math]::Min(20, $mwGatewaySecret.Length)))..." -ForegroundColor $DetailColor
        Write-Host "      Gateway:    $($gwGatewaySecret.Substring(0, [Math]::Min(20, $gwGatewaySecret.Length)))..." -ForegroundColor $DetailColor
        $allValid = $false
    }
    Write-Host ""
}

# ============================================================================
# 4. RESULTADO FINAL
# ============================================================================
Write-Host "┌───────────────────────────────────────────────────────────┐" -ForegroundColor $InfoColor
Write-Host "│ 4️⃣  Resultado Final                                       │" -ForegroundColor $InfoColor
Write-Host "└───────────────────────────────────────────────────────────┘" -ForegroundColor $InfoColor
Write-Host ""

if ($allValid) {
    Write-Host "✅ VALIDACIÓN EXITOSA" -ForegroundColor $SuccessColor
    Write-Host "   Todas las configuraciones críticas coinciden correctamente." -ForegroundColor $SuccessColor
    Write-Host ""
    Write-Host "✅ El Middleware Node.js puede comunicarse con el Gateway .NET" -ForegroundColor $SuccessColor
    Write-Host ""
} else {
    Write-Host "❌ VALIDACIÓN FALLIDA" -ForegroundColor $ErrorColor
    Write-Host "   Existen diferencias críticas en la configuración." -ForegroundColor $ErrorColor
    Write-Host ""
    Write-Host "📝 Acciones requeridas:" -ForegroundColor $WarningColor
    Write-Host ""
    
    if ([string]::IsNullOrWhiteSpace($mwJwtSecretKey) -or $mwJwtSecretKey -like "*CHANGE_THIS*") {
        Write-Host "   1️⃣  Generar JWT_SECRET_KEY para Middleware:" -ForegroundColor $WarningColor
        Write-Host "      .\Generate-JwtSecretKey.ps1 -SecretType JWT -Output EnvFile -Environment $Environment" -ForegroundColor $DetailColor
        Write-Host ""
    }
    
    if ([string]::IsNullOrWhiteSpace($gwJwtSecretKey)) {
        Write-Host "   2️⃣  Configurar JWT_SECRET_KEY en Gateway User Secrets:" -ForegroundColor $WarningColor
        Write-Host "      cd $gatewayProjectPath" -ForegroundColor $DetailColor
        Write-Host "      dotnet user-secrets set 'JwtSettings:SecretKey' '<mismo-valor-que-middleware>'" -ForegroundColor $DetailColor
        Write-Host ""
    }
    
    if ($mwJwtSecretKey -ne $gwJwtSecretKey -and -not [string]::IsNullOrWhiteSpace($mwJwtSecretKey) -and -not [string]::IsNullOrWhiteSpace($gwJwtSecretKey)) {
        Write-Host "   3️⃣  Sincronizar JWT_SECRET_KEY (deben ser iguales):" -ForegroundColor $WarningColor
        Write-Host "      Opción A: Copiar valor de Middleware a Gateway" -ForegroundColor $DetailColor
        Write-Host "      Opción B: Generar nuevo secreto y actualizar ambos" -ForegroundColor $DetailColor
        Write-Host ""
    }
    
    if ($CheckGatewaySecret) {
        if ([string]::IsNullOrWhiteSpace($mwGatewaySecret) -or $mwGatewaySecret -like "*CHANGE_THIS*") {
            Write-Host "   4️⃣  Generar GATEWAY_SECRET para Middleware:" -ForegroundColor $WarningColor
            Write-Host "      .\Generate-JwtSecretKey.ps1 -SecretType Gateway -Output EnvFile -Environment $Environment" -ForegroundColor $DetailColor
            Write-Host ""
        }
        
        if ($mwGatewaySecret -ne $gwGatewaySecret -and -not [string]::IsNullOrWhiteSpace($mwGatewaySecret) -and -not [string]::IsNullOrWhiteSpace($gwGatewaySecret)) {
            Write-Host "   5️⃣  Sincronizar GATEWAY_SECRET (deben ser iguales):" -ForegroundColor $WarningColor
            Write-Host "      Actualizar ambos con el mismo valor" -ForegroundColor $DetailColor
            Write-Host ""
        }
    }
    
    exit 1
}

Write-Host "📚 Documentación adicional:" -ForegroundColor $InfoColor
Write-Host "   • README.md del Middleware" -ForegroundColor $DetailColor
Write-Host "   • README.md del Gateway" -ForegroundColor $DetailColor
Write-Host ""

exit 0
