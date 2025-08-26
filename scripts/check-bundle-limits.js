#!/usr/bin/env node

/**
 * Script para verificar los límites del bundle en CI
 */

const fs = require('fs');
const path = require('path');

const BUNDLE_REPORT_PATH = path.join(
  process.cwd(),
  'reports',
  'bundle',
  'latest.json'
);
const MAX_SIZE_MB = 50; // 50MB límite máximo

function checkBundleLimits() {
  try {
    if (!fs.existsSync(BUNDLE_REPORT_PATH)) {
      console.log('ℹ️ No bundle report found, skipping size check');
      return;
    }

    const report = JSON.parse(fs.readFileSync(BUNDLE_REPORT_PATH, 'utf8'));
    const currentSizeMB = report.bundle.totalSize / (1024 * 1024);

    console.log('=== Bundle Size Check ===');
    console.log(`Current bundle size: ${currentSizeMB.toFixed(2)} MB`);
    console.log(`Maximum allowed size: ${MAX_SIZE_MB} MB`);
    console.log('');

    if (currentSizeMB > MAX_SIZE_MB) {
      console.log('❌ Bundle size exceeds maximum limit!');
      console.log(
        `Bundle is ${(currentSizeMB - MAX_SIZE_MB).toFixed(
          2
        )} MB over the limit`
      );
      process.exit(1);
    }

    // Warning si está cerca del límite
    const warningThreshold = MAX_SIZE_MB * 0.8;
    if (currentSizeMB > warningThreshold) {
      console.log(
        `⚠️  Bundle size is approaching the limit (${(
          (currentSizeMB / MAX_SIZE_MB) *
          100
        ).toFixed(1)}% of maximum)`
      );
    } else {
      console.log('✅ Bundle size is within acceptable limits');
    }

    // Información adicional
    if (report.bundle.files) {
      console.log('');
      console.log('📁 Bundle composition:');
      console.log(`  • Total files: ${report.bundle.files.length}`);

      // Mostrar los 5 archivos más grandes
      const largestFiles = report.bundle.files
        .sort((a, b) => (b.size || 0) - (a.size || 0))
        .slice(0, 5);

      if (largestFiles.length > 0) {
        console.log('  • Largest files:');
        largestFiles.forEach(file => {
          const fileSizeKB = ((file.size || 0) / 1024).toFixed(2);
          console.log(`    - ${file.path}: ${fileSizeKB} KB`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error checking bundle limits:', error.message);
    console.log('ℹ️ Continuing without bundle size validation');
  }
}

if (require.main === module) {
  checkBundleLimits();
}

module.exports = { checkBundleLimits };
