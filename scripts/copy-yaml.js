const fs = require('fs');
const path = require('path');

// Crear directorio de destino si no existe
const distRoutesDir = path.join(__dirname, '..', 'dist', 'routes');
if (!fs.existsSync(distRoutesDir)) {
  fs.mkdirSync(distRoutesDir, { recursive: true });
}

// Copiar archivos .yaml
const srcRoutesDir = path.join(__dirname, '..', 'src', 'routes');
const files = fs
  .readdirSync(srcRoutesDir)
  .filter(file => file.endsWith('.yaml'));

files.forEach(file => {
  const src = path.join(srcRoutesDir, file);
  const dest = path.join(distRoutesDir, file);
  fs.copyFileSync(src, dest);
  console.log(`Copiado: ${file}`);
});

console.log(`Archivos YAML copiados: ${files.length}`);
