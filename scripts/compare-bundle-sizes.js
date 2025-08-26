#!/usr/bin/env node

/**
 * Script para comparar tamaños de bundle entre branches en CI
 */

const fs = require('fs');
const path = require('path');

const CURRENT_BUNDLE_PATH = '/tmp/current-bundle.json';
const BASE_BUNDLE_PATH = '/tmp/base-bundle.json';

function compareBundleSizes() {
  try {
    console.log('=== Bundle Size Comparison ===');

    // Verificar que existen ambos archivos
    if (!fs.existsSync(CURRENT_BUNDLE_PATH)) {
      console.log('ℹ️ Current bundle report not found, skipping comparison');
      return;
    }

    if (!fs.existsSync(BASE_BUNDLE_PATH)) {
      console.log('ℹ️ Base bundle report not found, skipping comparison');
      return;
    }

    const currentBundle = JSON.parse(
      fs.readFileSync(CURRENT_BUNDLE_PATH, 'utf8')
    );
    const baseBundle = JSON.parse(fs.readFileSync(BASE_BUNDLE_PATH, 'utf8'));

    const currentSize = currentBundle.bundle.totalSize;
    const baseSize = baseBundle.bundle.totalSize;
    const difference = currentSize - baseSize;
    const percentageChange = ((difference / baseSize) * 100).toFixed(2);

    console.log(
      `Base branch size: ${(baseSize / (1024 * 1024)).toFixed(2)} MB`
    );
    console.log(
      `Current branch size: ${(currentSize / (1024 * 1024)).toFixed(2)} MB`
    );
    console.log(
      `Difference: ${(difference / (1024 * 1024)).toFixed(
        2
      )} MB (${percentageChange}%)`
    );
    console.log('');

    if (Math.abs(difference) < 1024) {
      console.log('✅ No significant change in bundle size');
    } else if (difference > 0) {
      console.log(
        `📈 Bundle size increased by ${(difference / (1024 * 1024)).toFixed(
          2
        )} MB`
      );
      if (parseFloat(percentageChange) > 10) {
        console.log('⚠️ Significant size increase detected!');
        console.log(
          'Consider reviewing the changes that led to this increase.'
        );
      }
    } else {
      console.log(
        `📉 Bundle size decreased by ${(
          Math.abs(difference) /
          (1024 * 1024)
        ).toFixed(2)} MB - Great job!`
      );
    }

    // Análisis de archivos si está disponible
    if (currentBundle.bundle.files && baseBundle.bundle.files) {
      const currentFileCount = currentBundle.bundle.files.length;
      const baseFileCount = baseBundle.bundle.files.length;
      const fileCountDiff = currentFileCount - baseFileCount;

      console.log('');
      console.log('📁 File count analysis:');
      console.log(`  • Base branch: ${baseFileCount} files`);
      console.log(`  • Current branch: ${currentFileCount} files`);

      if (fileCountDiff !== 0) {
        const action = fileCountDiff > 0 ? 'added' : 'removed';
        console.log(`  • ${Math.abs(fileCountDiff)} files ${action}`);
      }
    }
  } catch (error) {
    console.log('ℹ️ Could not compare bundle sizes:', error.message);
    console.log(
      'This is normal for new branches or when bundle reports are not available.'
    );
  }
}

if (require.main === module) {
  compareBundleSizes();
}

module.exports = { compareBundleSizes };
