# 📝 Changelog de Documentación - Middleware

## 🆕 Cambios Recientes (7 Nov 2025)

### Endpoints Nuevos

#### ✅ POST `/api/analyze/anonymous`
- **Propósito**: Análisis de accesibilidad sin autenticación ni persistencia
- **Sin JWT**: No requiere token de autenticación
- **Sin BD**: No guarda resultados en base de datos
- **Casos de uso**:
  - Demos públicas
  - Pruebas rápidas sin registro
  - Testing de herramientas
  - Análisis temporales

### Estructura de Respuesta Actualizada

#### Campos Nuevos en Todas las Respuestas

**`isAnonymous`** (boolean):
- `false` - Usuario autenticado con persistencia
- `true` - Usuario anónimo sin persistencia

#### Diferencias en Respuestas

| Campo | Usuario Autenticado | Usuario Anónimo |
|-------|---------------------|-----------------|
| **Endpoint** | `POST /api/analyze` | `POST /api/analyze/anonymous` |
| **Autenticación** | ✅ Requiere JWT | ❌ No requiere |
| **`userId`** | Requerido | No aceptado |
| **`analysisSaved`** | `true` | `false` |
| **`analysisId`** | número (ID en BD) | `null` |
| **`persistence`** | Objeto completo | `null` |
| **`totalErrors`** | Presente | Ausente |
| **`errorsSummary`** | Presente | Ausente |
| **`isAnonymous`** | `false` | `true` |

#### Ejemplo de Respuesta - Usuario Autenticado

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "meta": { ... },
    "results": [ ... ],
    "total": 2,
    "analysisSaved": true,
    "message": "Análisis completado con detalles de persistencia",
    "analysisId": 1,
    "persistence": {
      "analysis": { "success": 1, "error": 0, "message": "..." },
      "results": { "success": 2, "error": 0, "message": "..." },
      "errors": { "success": 2, "error": 0, "message": "..." },
      "history": { "success": 1, "error": 0, "message": "..." }
    },
    "totalErrors": 0,
    "errorsSummary": {
      "resultSaveErrors": 0,
      "errorSaveErrors": 0
    },
    "isAnonymous": false
  },
  "requestId": "1be5cb7c-794c-4be7-9bd6-967350558474"
}
```

#### Ejemplo de Respuesta - Usuario Anónimo

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "meta": { ... },
    "results": [ ... ],
    "total": 2,
    "analysisSaved": false,
    "message": "Anonymous analysis completed successfully",
    "analysisId": null,
    "persistence": null,
    "isAnonymous": true
  },
  "requestId": "94290097-0657-4bf9-bd19-edb24ccf2a71"
}
```

### Parámetros de Request Actualizados

#### POST `/api/analyze` (Autenticado)

```json
{
  "inputType": "url" | "html",
  "value": "https://example.com",
  "tool": "axe-core" | "equal-access" | "both",
  "wcagVersion": "2.0" | "2.1" | "2.2",
  "wcagLevel": "A" | "AA" | "AAA",
  "cumulativeWcag": false,
  "userId": 123  // ✅ REQUERIDO
}
```

#### POST `/api/analyze/anonymous` (Anónimo)

```json
{
  "inputType": "url" | "html",
  "value": "https://example.com",
  "tool": "axe-core" | "equal-access" | "both",
  "wcagVersion": "2.0" | "2.1" | "2.2",
  "wcagLevel": "A" | "AA" | "AAA",
  "cumulativeWcag": false
  // ❌ userId NO se acepta
}
```

### Ejemplos de Uso Actualizados

#### cURL - Análisis Anónimo

```bash
curl -X POST http://localhost:3001/api/analyze/anonymous \
  -H "Content-Type: application/json" \
  -d '{
    "inputType": "url",
    "value": "https://example.com",
    "tool": "axe-core",
    "wcagVersion": "2.2",
    "wcagLevel": "AA"
  }'
```

#### cURL - Análisis Autenticado

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "inputType": "url",
    "value": "https://example.com",
    "tool": "axe-core",
    "wcagVersion": "2.2",
    "wcagLevel": "AA",
    "userId": 123
  }'
```

#### JavaScript/Fetch - Análisis Anónimo

```javascript
const response = await fetch('http://localhost:3001/api/analyze/anonymous', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    inputType: 'url',
    value: 'https://example.com',
    tool: 'axe-core',
    wcagVersion: '2.2',
    wcagLevel: 'AA'
  })
});

const result = await response.json();
console.log('Anonymous:', result.data.isAnonymous); // true
```

#### JavaScript/Fetch - Análisis Autenticado

```javascript
const response = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    inputType: 'url',
    value: 'https://example.com',
    tool: 'axe-core',
    wcagVersion: '2.2',
    wcagLevel: 'AA',
    userId: 123
  })
});

const result = await response.json();
console.log('Saved:', result.data.analysisSaved); // true
console.log('ID:', result.data.analysisId); // 1
```

### Archivos Actualizados

#### ✅ `/docs/API.md`
- ✨ Añadido endpoint `POST /api/analyze/anonymous`
- 🔄 Actualizada estructura de request para `/api/analyze`
- 📊 Añadida tabla comparativa de respuestas
- 🎯 Ejemplos específicos para cada tipo de usuario
- 📝 Documentación de campos `isAnonymous`, `persistence`, etc.

#### ✅ `/README.md`
- 🔄 Actualizada sección "Verificación Rápida"
- 📡 Actualizada sección "API Reference"
- 🆕 Añadido endpoint anónimo en Quick Start
- 📊 Tabla comparativa de diferencias

#### ✅ `/docs/CHANGELOG-DOCS.md` (este archivo)
- 📝 Changelog completo de cambios en documentación

### Retrocompatibilidad

✅ **Totalmente compatible con versiones anteriores**:
- Endpoint original `/api/analyze` funciona igual
- Respuestas mantienen todos los campos existentes
- Solo se añadieron campos nuevos opcionales (`isAnonymous`, etc.)
- Clientes existentes no se rompen

### Consideraciones para Frontend

#### Validación de Respuesta

```typescript
function isAuthenticatedResponse(response: AnalysisResponse): boolean {
  return response.data.isAnonymous === false;
}

function hasPersistedData(response: AnalysisResponse): boolean {
  return response.data.analysisSaved && response.data.analysisId !== null;
}
```

#### Manejo de Campos Condicionales

```typescript
// Siempre verificar isAnonymous antes de acceder a persistence
if (!response.data.isAnonymous && response.data.persistence) {
  console.log('Analysis ID:', response.data.analysisId);
  console.log('Saved results:', response.data.persistence.results.success);
} else {
  console.log('Anonymous analysis - not persisted');
}
```

#### Optional Chaining Recomendado

```typescript
const analysisId = response.data.analysisId ?? null;
const totalErrors = response.data.totalErrors ?? 0;
const persistence = response.data.persistence ?? null;
```

### Próximos Pasos

#### Para Desarrolladores Frontend
1. ✅ Revisar documento `c:\Git\accessibility-ui\docs\api-response-handling.md`
2. ✅ Implementar validación de `isAnonymous`
3. ✅ Adaptar UI para mostrar estado de persistencia
4. ✅ Añadir CTA para registro en análisis anónimos

#### Para Testing
1. ⚡ Añadir tests para endpoint `/anonymous`
2. ⚡ Verificar respuestas con y sin autenticación
3. ⚡ Validar que `userId` se ignora en endpoint anónimo
4. ⚡ Comprobar que no se guarda en BD

#### Para Documentación
1. ✅ API.md actualizado
2. ✅ README.md actualizado
3. ✅ CHANGELOG-DOCS.md creado
4. ⚠️ Pendiente: Actualizar Postman/Swagger collection

### Referencias

- **Implementación**: `src/routes/analyze.route.ts` (líneas ~1260-1350)
- **Helpers**: `src/routes/analyze.helpers.ts`
- **Tipos**: Ver interfaces en código fuente
- **Tests**: Pendiente añadir casos específicos

---

## Changelog Histórico

### v1.0.0 (Inicial)
- Documentación inicial de API
- Endpoint `/api/analyze` básico
- Estructura de respuesta original
