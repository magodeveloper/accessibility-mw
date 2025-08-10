import { Router } from 'express';
import { abortAfter } from '../utils/timing';
import { withPage } from '../services/render.service';
import { runAxeOnPage } from '../services/axe.service';
import { validatePublicHttpUrl } from '../utils/security';
import { runEqualAccess } from '../services/equalAccess.service';
import { AnalyzeRequestSchema } from '../schemas/analyze.schema';
import { mapAxeToUnified, mapEqualAccessToUnified, buildUnifiedResponse } from '../mappers/unifyResults';

export const analyzeRouter = Router();

/**
 * @openapi
 * /api/analyze:
 *   post:
 *     summary: Analiza accesibilidad (HTML o URL)
 *     tags: [Analyze]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalyzeRequest'
 *           examples:
 *             axe-core-Equal Access-html-advanced:
 *               summary: axe-core y Equal Access · HTML alta complejidad
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Avanzado</title>\n    <script>\n      document.addEventListener('DOMContentLoaded', () => {\n        const b = document.getElementById('abrir');\n        if (b) b.addEventListener('click', () => {\n          const d = document.getElementById('dlg');\n          if (d) d.removeAttribute('hidden');\n        });\n      });\n    </script>\n  </head>\n  <body>\n    <nav><a href=\"#main\">Ir al contenido</a></nav>\n    <main id=\"main\">\n      <h1>Catálogo</h1>\n      <div role=\"tablist\">\n        <button role=\"tab\" aria-selected=\"true\">Tab 1</button>\n        <button role=\"tab\">Tab 2</button>\n      </div>\n      <button id=\"abrir\">Abrir modal</button>\n      <div id=\"dlg\" role=\"dialog\" aria-modal=\"true\" hidden>\n        <h2>Título</h2>\n        <button>Cerrar</button>\n      </div>\n    </main>\n  </body>\n</html>\n"
 *                 tool: both
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-html-basic:
 *               summary: axe-core · HTML básico
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head><meta charset=\"utf-8\"><title>Hola</title></head>\n  <body>\n    <h1>Hola mundo</h1>\n    <p>Contenido de ejemplo.</p>\n  </body>\n</html>\n"
 *                 tool: axe-core
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-html-medium:
 *               summary: axe-core · HTML complejidad media (algunos problemas comunes)
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Ejemplo medio</title>\n    <style>.low-contrast{color:#999;background:#9a9a9a;}</style>\n  </head>\n  <body>\n    <img src=\"foto.jpg\">\n    <button></button>\n    <a href=\"#\">Leer más</a>\n    <p class=\"low-contrast\">Texto con bajo contraste.</p>\n    <form>\n      <label for=\"email\">Correo</label>\n      <input id=\"correo\" type=\"email\" placeholder=\"tu@correo.com\">\n      <button type=\"submit\">Enviar</button>\n    </form>\n  </body>\n</html>\n"
 *                 tool: axe-core
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-html-advanced:
 *               summary: axe-core · HTML alta complejidad (landmarks/ARIA)
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Avanzado</title>\n    <style>#menu{display:none;}</style>\n  </head>\n  <body>\n    <header role=\"banner\"><h1>Portal</h1></header>\n    <nav aria-label=\"principal\"><ul><li><a href=\"#m\">Menú</a></li></ul></nav>\n    <main id=\"m\" role=\"main\">\n      <section aria-labelledby=\"s1\"><h2 id=\"s1\">Productos</h2></section>\n      <button aria-haspopup=\"dialog\" aria-controls=\"dlg\">Abrir modal</button>\n      <div id=\"dlg\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"t\" hidden>\n        <h2 id=\"t\">Título modal</h2>\n        <button id=\"cerrar\">X</button>\n      </div>\n      <div role=\"button\">Acción</div>\n    </main>\n    <footer role=\"contentinfo\">© 2025</footer>\n  </body>\n</html>\n"
 *                 tool: axe-core
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-html-aspx:
 *               summary: axe-core · HTML con ASPX
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<%@ Page Language=\"C#\" AutoEventWireup=\"true\" %>\n<html lang=\"es\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>ASPX Sample</title>\n  </head>\n  <body>\n    <form id=\"form1\" runat=\"server\">\n      <h1><%= \"Hola desde ASPX\" %></h1>\n      <img src=\"/img/logo.png\">\n      <asp:TextBox ID=\"txtEmail\" runat=\"server\" />\n      <asp:Button ID=\"btnSend\" runat=\"server\" Text=\"\" />\n      <a href=\"#\">Más info</a>\n    </form>\n  </body>\n</html>\n"
 *                 tool: axe-core
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-html-php:
 *               summary: axe-core · HTML con PHP
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title><?php echo \"PHP Sample\"; ?></title>\n  </head>\n  <body>\n    <h1><?php echo \"Hola desde PHP\"; ?></h1>\n    <img src=\"/img/banner.jpg\">\n    <button></button>\n    <label for=\"email\">Correo</label>\n    <input id=\"correo\" type=\"email\">\n  </body>\n</html>\n"
 *                 tool: axe-core
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-html-react:
 *               summary: axe-core · HTML con React
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head>\n    <meta charset=\"utf-8\" />\n    <title>React Sample</title>\n    <script crossorigin src=\"https://unpkg.com/react@18/umd/react.development.js\"></script>\n    <script crossorigin src=\"https://unpkg.com/react-dom@18/umd/react-dom.development.js\"></script>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n    <script>\n      const e = React.createElement;\n      function App() {\n        return e('div', null,\n          e('h1', null, 'Hola React'),\n          e('button', null),\n          e('img', { src: '/img/x.png' })\n        );\n      }\n      ReactDOM.createRoot(document.getElementById('root')).render(e(App));\n    </script>\n  </body>\n</html>\n"
 *                 tool: axe-core
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             axe-url:
 *               summary: axe-core · URL pública
 *               value:
 *                 inputType: url
 *                 value: "https://www.elcomercio.com/"
 *                 tool: axe-core
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-html-basic:
 *               summary: Equal Access · HTML básico
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head><meta charset=\"utf-8\"><title>Hola</title></head>\n  <body>\n    <h1>Hola mundo</h1>\n    <p>Contenido de ejemplo.</p>\n  </body>\n</html>\n"
 *                 tool: equal-access
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-html-medium:
 *               summary: Equal Access · HTML complejidad media
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Ejemplo medio</title>\n  </head>\n  <body>\n    <img src=\"foto.jpg\">\n    <button aria-label=\"\"></button>\n    <label>Nombre<input type=\"text\"></label>\n    <a href=\"#\" role=\"button\">Más</a>\n    <ul><li tabindex=\"0\">Item sin rol</li></ul>\n  </body>\n</html>\n"
 *                 tool: equal-access
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-html-advanced:
 *               summary: Equal Access · HTML alta complejidad
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<html lang=\"es\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Avanzado</title>\n    <script>\n      document.addEventListener('DOMContentLoaded', () => {\n        const b = document.getElementById('abrir');\n        if (b) b.addEventListener('click', () => {\n          const d = document.getElementById('dlg');\n          if (d) d.removeAttribute('hidden');\n        });\n      });\n    </script>\n  </head>\n  <body>\n    <nav><a href=\"#main\">Ir al contenido</a></nav>\n    <main id=\"main\">\n      <h1>Catálogo</h1>\n      <div role=\"tablist\">\n        <button role=\"tab\" aria-selected=\"true\">Tab 1</button>\n        <button role=\"tab\">Tab 2</button>\n      </div>\n      <button id=\"abrir\">Abrir modal</button>\n      <div id=\"dlg\" role=\"dialog\" aria-modal=\"true\" hidden>\n        <h2>Título</h2>\n        <button>Cerrar</button>\n      </div>\n    </main>\n  </body>\n</html>\n"
 *                 tool: equal-access
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-html-aspx:
 *               summary: Equal Access · HTML con ASPX
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<%@ Page Language=\"C#\" AutoEventWireup=\"true\" %>\n<html>\n  <head>\n    <meta charset=\"utf-8\">\n    <title>ASPX Sample</title>\n    <style>.low-contrast{color:#9a9a9a;background:#9b9b9b;}</style>\n  </head>\n  <body>\n    <form id=\"form1\" runat=\"server\">\n      <h1>Portal</h1>\n      <p class=\"low-contrast\">Texto con bajo contraste</p>\n      <asp:CheckBox ID=\"chk\" runat=\"server\" />\n      <asp:LinkButton ID=\"lnk\" runat=\"server\">Click</asp:LinkButton>\n      <a role=\"button\">Acción</a>\n    </form>\n  </body>\n</html>\n"
 *                 tool: equal-access
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-html-php:
 *               summary: Equal Access · HTML con PHP
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"utf-8\">\n    <title><?= \"PHP Sample\" ?></title>\n  </head>\n  <body>\n    <nav><a href=\"#contenido\">Ir</a></nav>\n    <main id=\"contenido\">\n      <h1>Categorías</h1>\n      <ul>\n        <li tabindex=\"0\">Item</li>\n        <li><a href=\"#\">Leer más</a></li>\n      </ul>\n      <?php if (true): ?>\n      <div role=\"dialog\" aria-modal=\"true\">\n        <h2>Modal</h2>\n        <button>Cerrar</button>\n      </div>\n      <?php endif; ?>\n    </main>\n  </body>\n</html>\n"
 *                 tool: equal-access
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-html-react:
 *               summary: Equal Access · HTML con React
 *               value:
 *                 inputType: html
 *                 value: "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"utf-8\" />\n    <title>React Sample</title>\n    <script crossorigin src=\"https://unpkg.com/react@18/umd/react.development.js\"></script>\n    <script crossorigin src=\"https://unpkg.com/react-dom@18/umd/react-dom.development.js\"></script>\n    <style>.bad{color:#aaa;background:#aaa;}</style>\n  </head>\n  <body>\n    <div id=\"app\"></div>\n    <script>\n      const e = React.createElement;\n      const App = () => e('main', { id:'main' },\n        e('h1', { className:'bad' }, 'Catálogo'),\n        e('a', { href:'#', role:'button' }, 'Abrir'),\n        e('input', { type:'text', placeholder:'Nombre' })\n      );\n      ReactDOM.createRoot(document.getElementById('app')).render(e(App));\n    </script>\n  </body>\n</html>\n"
 *                 tool: equal-access
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *             equalaccess-url:
 *               summary: Equal Access · URL pública
 *               value:
 *                 inputType: url
 *                 value: "https://www.elcomercio.com/"
 *                 tool: equal-access
 *                 wcagVersion: "2.2"
 *                 wcagLevel: "AA"
 *     responses:
 *       200:
 *         description: Resultado unificado
 *       400:
 *         description: Error de validación
 *       500:
 *         description: Error interno
 */
analyzeRouter.post('/', async (req, res) => {

  const requestId = (req as any).id;

  const ANALYZE_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS ?? 60000);
  const NAVIGATION_TIMEOUT_MS = Number(process.env.NAVIGATION_TIMEOUT_MS ?? 30000);
  // margen extra para el wrapper externo (evita doble disparo simultáneo)
  const WRAP_MARGIN_MS = 500;

  // 1) Validación rápida de payload
  const parse = AnalyzeRequestSchema.safeParse(req.body);
  if (!parse.success) {
    const flat = parse.error.flatten();
    const fieldMsgs = Object.values(flat.fieldErrors).flat().filter(Boolean);
    const message = [...flat.formErrors, ...fieldMsgs].join(', ') || 'Datos inválidos';

    req.log?.warn({ requestId, message, details: flat }, 'Analyze blocked by schema');
    return res.status(400).json({
      ok: false,
      error: message,
      // En prod podrías ocultar details para no filtrar estructura interna
      details: process.env.NODE_ENV === 'production' ? undefined : flat,
      requestId
    });
  }

  const { inputType, value, tool, wcagVersion, wcagLevel } = parse.data;

  try {
    // 2) Validación fuerte de URL (SSRF/puertos/redirects)
    let navValue = value;
    if (inputType === 'url') {
      await validatePublicHttpUrl(value, {
        fetchBody: false,
        requireHtmlContentType: false,
        throwOnError: true
      });
      // si no lanzó, puedes normalizar tomando la propia value
      navValue = value;
    }
    // 3) Ejecutar herramientas seleccionadas
    type ToolResult = ReturnType<typeof mapAxeToUnified> | ReturnType<typeof mapEqualAccessToUnified>;
    const parts: ToolResult[] = [];

    if (tool === 'axe-core' || tool === 'both') {
      const axeRaw = await abortAfter(
        ANALYZE_TIMEOUT_MS + WRAP_MARGIN_MS,
        withPage(
          inputType,
          navValue,
          async (page) => runAxeOnPage(page),
          { overallTimeoutMs: ANALYZE_TIMEOUT_MS, navTimeoutMs: NAVIGATION_TIMEOUT_MS }
        ),
        { tool: 'axe-core', phase: 'withPage/axe' }
      );
      parts.push(mapAxeToUnified(axeRaw, wcagVersion, wcagLevel));
    }

    if (tool === 'equal-access' || tool === 'both') {
       const eaReport = await abortAfter(
        ANALYZE_TIMEOUT_MS + WRAP_MARGIN_MS,
        withPage(
          inputType,
          navValue,
          async (page) => runEqualAccess(page, `scan-${Date.now()}`),
          { overallTimeoutMs: ANALYZE_TIMEOUT_MS, navTimeoutMs: NAVIGATION_TIMEOUT_MS }
        ),
        { tool: 'equal-access', phase: 'withPage/equal-access' }
      );
      parts.push(mapEqualAccessToUnified(eaReport, wcagVersion, wcagLevel));
    }

    // Defensa: si por alguna razón no agregó nada
    if (parts.length === 0) {
      req.log?.warn({ requestId, tool }, 'No tool selected after validation');
      return res.status(400).json({
        ok: false,
        error: 'No se seleccionó ninguna herramienta válida',
        requestId
      });
    }

    // 4) Unificar y responder
    const unified = buildUnifiedResponse(parts as any);
    return res.json(unified);
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    const isTimeout = /timeout/i.test(msg);
    const status = isTimeout ? 504 : 500;
    req.log?.error({ requestId, err }, 'Analyze error');
    return res.status(status).json({
      ok: false,
      error: isTimeout ? 'Analysis timed out' : (err?.message ?? 'Internal error'),
      requestId
    });
  }
});