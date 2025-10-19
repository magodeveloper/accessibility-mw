/**
 * Mock HTTP server para simular MS-Analysis y MS-Reports
 * Se usa automáticamente en local cuando los servicios reales no están disponibles
 */

import http from 'node:http';

let analysisServer: http.Server | null = null;
let reportsServer: http.Server | null = null;

interface AnalysisData {
  id: number;
  userId: number;
  sessionId?: string;
  url: string;
  sourceUrl?: string;
  status?: string;
  totalIssues?: number;
  criticalIssues?: number;
  seriousIssues?: number;
  moderateIssues?: number;
  minorIssues?: number;
  results: any;
  metadata?: any;
  createdAt: string;
}

interface ReportData {
  id: number;
  userId: number;
  analysisId: number;
  title?: string;
  reportType: string;
  format: string;
  status: string;
  summary?: any;
  metadata?: any;
  createdAt: string;
}

const analysisStore: Map<number, AnalysisData> = new Map();
const reportsStore: Map<number, ReportData> = new Map();
let analysisIdCounter = 1;
let reportIdCounter = 1;

/**
 * Mock MS-Analysis API
 */
function createAnalysisServer(port: number = 8082): http.Server {
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url || '';

    // Health endpoints
    if (url === '/health' || url === '/health/live' || url === '/health/ready') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'Healthy', service: 'ms-analysis-mock' }));
      return;
    }

    // POST /api/analysis - Create analysis
    if (url === '/api/analysis' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          
          // Validate required field: userId must be present
          if (!payload.userId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'userId is required' }));
            return;
          }
          
          const id = analysisIdCounter++;
          const analysis: AnalysisData = {
            id,
            userId: payload.userId,
            sessionId: payload.sessionId,
            url: payload.url || 'https://example.com',
            sourceUrl: payload.sourceUrl || payload.url || 'https://example.com',
            status: payload.status,
            totalIssues: payload.totalIssues,
            criticalIssues: payload.criticalIssues,
            seriousIssues: payload.seriousIssues,
            moderateIssues: payload.moderateIssues,
            minorIssues: payload.minorIssues,
            results: payload.results || {},
            metadata: payload.metadata,
            createdAt: new Date().toISOString()
          };
          analysisStore.set(id, analysis);
          
          const response = { data: analysis };
          
          res.writeHead(201, { 'Content-Type': 'application/json' });
          // Tests expect { data: {...} } structure (single level nesting)
          res.end(JSON.stringify(response));
        } catch (error) {
          console.error('Invalid JSON body for /api/analysis:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // GET /api/analysis/:id - Get analysis by ID
    if (url.startsWith('/api/analysis/') && req.method === 'GET') {
      const parts = url.split('/');
      const idOrSegment = parts[3];
      
      // Check if it's "user" segment
      if (idOrSegment === 'user') {
        const userId = Number.parseInt(parts[4]);
        const userAnalyses = Array.from(analysisStore.values())
          .filter(a => a.userId === userId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: userAnalyses }));
        return;
      }
      
      // Otherwise it's an ID
      const id = Number.parseInt(idOrSegment);
      const analysis = analysisStore.get(id);
      
      if (analysis) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        // Tests expect { analysis: {...} } structure for GET by ID (matching MS-Analysis behavior)
        res.end(JSON.stringify({ analysis }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Analysis not found' }));
      }
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Not found' }));
  });

  server.listen(port);
  return server;
}

/**
 * Mock MS-Reports API
 */
function createReportsServer(port: number = 8083): http.Server {
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url || '';

    // Health endpoints
    if (url === '/health' || url === '/health/live' || url === '/health/ready') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'Healthy', service: 'ms-reports-mock' }));
      return;
    }

    // POST /api/reports OR /api/Report - Create report
    if ((url === '/api/reports' || url === '/api/Report') && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          
          // Validate required field: userId must be present (unless analysisId is provided, which implies it comes from JWT)
          if (!payload.userId && !payload.analysisId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'userId or analysisId is required' }));
            return;
          }
          
          const id = reportIdCounter++;
          const report: ReportData = {
            id,
            userId: payload.userId || 1, // Default to 1 if not provided (JWT scenario)
            analysisId: payload.analysisId || 1,
            title: payload.title,
            reportType: payload.reportType || 'accessibility-audit',
            format: payload.format || 'pdf',
            status: payload.status || 'completed',
            summary: payload.summary,
            metadata: payload.metadata,
            createdAt: new Date().toISOString()
          };
          reportsStore.set(id, report);
          
          // Use 201 for /api/reports (matches real-reports-api tests)
          // Use 200 for /api/Report (matches analyze-real tests comment)
          const statusCode = url === '/api/Report' ? 200 : 201;
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          // Tests expect { data: {...} } structure (single level nesting)
          res.end(JSON.stringify({ data: report }));
        } catch (error) {
          console.error('Invalid JSON body for /api/reports:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // GET /api/reports/:id - Get report by ID or handle sub-routes
    if (url.startsWith('/api/reports/') && req.method === 'GET') {
      const parts = url.split('/');
      const idOrSegment = parts[3];
      
      // GET /api/reports/user/:userId
      if (idOrSegment === 'user') {
        const userId = Number.parseInt(parts[4]);
        const userReports = Array.from(reportsStore.values())
          .filter(r => r.userId === userId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: userReports }));
        return;
      }
      
      // GET /api/reports/analysis/:analysisId
      if (idOrSegment === 'analysis') {
        const analysisId = Number.parseInt(parts[4]);
        const analysisReports = Array.from(reportsStore.values())
          .filter(r => r.analysisId === analysisId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: analysisReports }));
        return;
      }
      
      // Otherwise it's a report ID
      const id = Number.parseInt(idOrSegment);
      const report = reportsStore.get(id);
      
      if (report) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: report }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Report not found' }));
      }
      return;
    }

    // PUT or PATCH /api/reports/:id - Update report
    if (url.match(/\/api\/reports\/\d+/) && (req.method === 'PUT' || req.method === 'PATCH')) {
      const id = Number.parseInt(url.split('/')[3]);
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const report = reportsStore.get(id);
          
          if (report) {
            // Update fields
            report.status = payload.status || report.status;
            if (payload.metadata) {
              report.metadata = payload.metadata;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: report }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Report not found' }));
          }
        } catch (error) {
          console.error('Invalid JSON body for PUT/PATCH /api/reports/:id', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Not found' }));
  });

  server.listen(port);
  return server;
}

/**
 * Start mock services
 */
export async function startMockServices(): Promise<void> {
  if (analysisServer || reportsServer) {
    console.log('⚠️  Mock services already running');
    return;
  }

  analysisServer = createAnalysisServer(8082);
  reportsServer = createReportsServer(8083);

  // Wait for servers to be ready
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('✅ Mock MS-Analysis running on http://127.0.0.1:8082');
  console.log('✅ Mock MS-Reports running on http://127.0.0.1:8083');
}

/**
 * Stop mock services
 */
export async function stopMockServices(): Promise<void> {
  if (analysisServer) {
    analysisServer.close();
    analysisServer = null;
  }
  if (reportsServer) {
    reportsServer.close();
    reportsServer = null;
  }

  analysisStore.clear();
  reportsStore.clear();
  analysisIdCounter = 1;
  reportIdCounter = 1;

  console.log('🛑 Mock services stopped');
}

/**
 * Check if real services are available
 */
export async function areRealServicesAvailable(): Promise<boolean> {
  try {
    const analysisResponse = await fetch('http://127.0.0.1:8082/health', {
      signal: AbortSignal.timeout(2000)
    });
    const reportsResponse = await fetch('http://127.0.0.1:8083/health', {
      signal: AbortSignal.timeout(2000)
    });

    return analysisResponse.ok && reportsResponse.ok;
  } catch {
    return false;
  }
}

/**
 * Setup helper - auto start mocks if real services not available
 */
export async function setupServices(): Promise<{ usingMocks: boolean }> {
  const realServicesAvailable = await areRealServicesAvailable();

  if (!realServicesAvailable) {
    console.log('🎭 Real services not available, starting mocks...');
    await startMockServices();
    return { usingMocks: true };
  }

  console.log('🔗 Using real microservices');
  return { usingMocks: false };
}

/**
 * Teardown helper
 */
export async function teardownServices(usingMocks: boolean): Promise<void> {
  if (usingMocks) {
    await stopMockServices();
  }
}
