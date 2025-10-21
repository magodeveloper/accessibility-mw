#!/usr/bin/env node
/**
 * Production Validation Script
 * Validates production configuration before deployment
 */

const fs = require('node:fs');
const path = require('node:path');

// ANSI Colors
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

let errorCount = 0;
let warningCount = 0;
let checkCount = 0;

function header(message) {
    console.log(`\n${colors.blue}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}  ${message}${colors.reset}`);
    console.log(`${colors.blue}${'═'.repeat(60)}${colors.reset}`);
}

function success(message) {
    console.log(`  ${colors.green}✅ ${message}${colors.reset}`);
    checkCount++;
}

function error(message) {
    console.log(`  ${colors.red}❌ ERROR: ${message}${colors.reset}`);
    errorCount++;
}

function warning(message) {
    console.log(`  ${colors.yellow}⚠️  WARNING: ${message}${colors.reset}`);
    warningCount++;
}

function info(message) {
    console.log(`  ℹ️  ${message}`);
}

// ═══════════════════════════════════════════════════════
// 1. VALIDATE REQUIRED FILES
// ═══════════════════════════════════════════════════════
header('1. Validating Required Files');

const requiredFiles = [
    '.env.production',
    'Dockerfile',
    'docker-compose.production.yml',
    'package.json',
    'tsconfig.json',
    '.achecker.yml',
];

for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
        success(`File found: ${file}`);
    } else {
        error(`Missing file: ${file}`);
    }
}

// ═══════════════════════════════════════════════════════
// 2. VALIDATE ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════
header('2. Validating Environment Variables (.env.production)');

if (fs.existsSync('.env.production')) {
    const envContent = fs.readFileSync('.env.production', 'utf8');

    // Critical variables that should NOT have placeholder values
    const criticalVars = {
        JWT_SECRET_KEY: ['CHANGE_THIS', 'YOUR_', 'PLACEHOLDER', 'EXAMPLE', 'TEST'],
        GATEWAY_SECRET: ['CHANGE_THIS', 'YOUR_', 'PLACEHOLDER', 'EXAMPLE', 'TEST'],
    };

    for (const [varName, placeholders] of Object.entries(criticalVars)) {
        const match = envContent.match(new RegExp(`${varName}=(.+)`));
        if (match) {
            const value = match[1].trim();
            const isPlaceholder = placeholders.some(p => value.includes(p));

            if (isPlaceholder) {
                error(
                    `${varName} contains placeholder value. Must be configured with secure value.`
                );
            } else if (value.length < 32) {
                error(
                    `${varName} must be at least 32 characters (current: ${value.length})`
                );
            } else {
                success(`${varName} configured correctly (${value.length} characters)`);
            }
        } else {
            error(`${varName} not found in .env.production`);
        }
    }

    // Required variables
    const requiredVars = [
        'NODE_ENV',
        'PORT',
        'HOST',
        'CORS_ORIGINS',
        'ANALYSIS_API_URL',
        'GATEWAY_VALIDATION_ENABLED',
        'PLAYWRIGHT_HEADLESS',
    ];

    for (const varName of requiredVars) {
        if (envContent.includes(`${varName}=`)) {
            success(`${varName} found`);
        } else {
            error(`${varName} missing in .env.production`);
        }
    }

    // Validate specific production values
    if (envContent.match(/NODE_ENV=production/)) {
        success('NODE_ENV=production configured correctly');
    } else {
        error("NODE_ENV must be 'production'");
    }

    if (envContent.match(/GATEWAY_VALIDATION_ENABLED=true/)) {
        success('GATEWAY_VALIDATION_ENABLED=true (security enabled)');
    } else {
        warning("GATEWAY_VALIDATION_ENABLED should be 'true' for production");
    }

    if (envContent.match(/HOST=0\.0\.0\.0/)) {
        success('HOST=0.0.0.0 configured for Docker/Kubernetes');
    } else {
        warning("HOST should be '0.0.0.0' in production for Docker");
    }

    if (envContent.match(/TRUST_PROXY=true/)) {
        success('TRUST_PROXY=true configured for reverse proxy');
    } else {
        warning("TRUST_PROXY should be 'true' in production with proxy/load balancer");
    }

    // Validate development flags are disabled
    const devFlags = [
        'BYPASS_SSRF_VALIDATION_IN_DEV',
        'ALLOW_PRIVATE_IPS_IN_DEV',
        'ALLOW_LOOPBACK_IN_DEV',
        'RELAX_TLS_IN_DEV',
    ];

    for (const flag of devFlags) {
        if (envContent.match(new RegExp(`${flag}=true`))) {
            error(`${flag} is enabled. MUST be 'false' in production.`);
        } else {
            success(`${flag} disabled (safe for production)`);
        }
    }
} else {
    error('.env.production file not found');
}

// ═══════════════════════════════════════════════════════
// 3. VALIDATE DEPENDENCIES
// ═══════════════════════════════════════════════════════
header('3. Validating Dependencies');

if (fs.existsSync('node_modules')) {
    success('node_modules installed');

    if (fs.existsSync('package-lock.json')) {
        success('package-lock.json present (reproducible builds)');
    } else {
        warning('package-lock.json missing (recommended for production)');
    }
} else {
    warning("node_modules not found. Run 'npm ci' before deploying.");
}

// ═══════════════════════════════════════════════════════
// 4. VALIDATE DOCKERFILE
// ═══════════════════════════════════════════════════════
header('4. Validating Dockerfile');

if (fs.existsSync('Dockerfile')) {
    const dockerContent = fs.readFileSync('Dockerfile', 'utf8');

    if (dockerContent.match(/FROM.*AS builder/)) {
        success('Multi-stage build configured');
    } else {
        warning('Multi-stage build not detected');
    }

    if (dockerContent.match(/NODE_ENV=production/)) {
        success('NODE_ENV=production in Dockerfile');
    } else {
        warning('NODE_ENV not configured in Dockerfile');
    }

    if (dockerContent.match(/HEALTHCHECK/)) {
        success('Healthcheck configured');
    } else {
        warning('Healthcheck not configured in Dockerfile');
    }

    if (dockerContent.match(/USER.*pwuser/)) {
        success('Non-root user configured (pwuser)');
    } else {
        warning('Non-root user not detected');
    }
}

// ═══════════════════════════════════════════════════════
// 5. VALIDATE BUILD
// ═══════════════════════════════════════════════════════
header('5. Validating TypeScript Build');

if (fs.existsSync('dist')) {
    success('dist/ directory exists');

    if (fs.existsSync('dist/server.js')) {
        success('dist/server.js compiled');
    } else {
        warning("dist/server.js not found. Run 'npm run build'");
    }
} else {
    warning("dist/ directory not found. Run 'npm run build' before deploying.");
}

// ═══════════════════════════════════════════════════════
// 6. VALIDATE DOCKER COMPOSE
// ═══════════════════════════════════════════════════════
header('6. Validating Docker Compose Production');

if (fs.existsSync('docker-compose.production.yml')) {
    success('docker-compose.production.yml found');

    const composeContent = fs.readFileSync('docker-compose.production.yml', 'utf8');

    if (composeContent.match(/restart:.*unless-stopped/)) {
        success('Restart policy configured');
    } else {
        warning('Restart policy not detected');
    }

    if (composeContent.match(/healthcheck:/)) {
        success('Healthcheck configured in compose');
    }

    if (composeContent.match(/resources:/)) {
        success('Resource limits configured');
    }
} else {
    error('docker-compose.production.yml not found');
}

// ═══════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════
header('Validation Summary');

console.log('');
console.log(`  Total checks: ${colors.blue}${checkCount}${colors.reset}`);
console.log(
    `  Errors: ${errorCount > 0 ? colors.red : colors.green}${errorCount}${colors.reset}`
);
console.log(
    `  Warnings: ${warningCount > 0 ? colors.yellow : colors.green}${warningCount}${colors.reset}`
);
console.log('');

if (errorCount > 0) {
    console.log(`${colors.red}${'═'.repeat(60)}${colors.reset}`);
    console.log(
        `${colors.red}  ❌ VALIDATION FAILED - DO NOT DEPLOY TO PRODUCTION${colors.reset}`
    );
    console.log(`${colors.red}${'═'.repeat(60)}${colors.reset}`);
    process.exit(1);
} else if (warningCount > 0) {
    console.log(`${colors.yellow}${'═'.repeat(60)}${colors.reset}`);
    console.log(
        `${colors.yellow}  ⚠️  VALIDATION WITH WARNINGS - REVIEW BEFORE DEPLOY${colors.reset}`
    );
    console.log(`${colors.yellow}${'═'.repeat(60)}${colors.reset}`);
    process.exit(0);
} else {
    console.log(`${colors.green}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.green}  ✅ VALIDATION SUCCESSFUL - READY FOR PRODUCTION${colors.reset}`);
    console.log(`${colors.green}${'═'.repeat(60)}${colors.reset}`);
    process.exit(0);
}
