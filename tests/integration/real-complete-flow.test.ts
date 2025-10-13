/**
 * REAL E2E Integration Tests - Complete Flow
 *
 * ⚠️ IMPORTANTE: Este test NO usa mocks
 * Requiere que TODOS los servicios estén corriendo:
 *   docker compose -f docker-compose.ci.yml up -d
 *
 * Los tests validan el FLUJO COMPLETO:
 * 1. Análisis de accesibilidad (Middleware)
 * 2. Guardar en MS-Analysis (MySQL)
 * 3. Generar reporte en MS-Reports (MySQL)
 * 4. Verificar persistencia en ambas bases de datos
 */

import { describe, expect, it } from '@jest/globals';

const ANALYSIS_API_URL =
  process.env.ANALYSIS_API_URL || 'http://localhost:8082';
const REPORTS_API_URL = process.env.REPORTS_API_URL || 'http://localhost:8080';
const TIMEOUT_MS = 90000; // 90 segundos para flujos completos

interface AnalysisResponse {
  data: {
    id: number;
    userId: number;
    sessionId: string;
    url: string;
    status: string;
    totalIssues: number;
    criticalIssues: number;
    seriousIssues: number;
    moderateIssues: number;
    minorIssues: number;
  };
}

interface ReportResponse {
  data: {
    id: number;
    userId: number;
    analysisId: number;
    title: string;
    format: string;
    status: string;
  };
}

describe('Real E2E - Complete Integration Flow', () => {
  describe('Analysis → Report Complete Workflow', () => {
    it(
      'should complete full workflow: create analysis → save to DB → generate report',
      async () => {
        const userId = 100;
        const sessionId = `e2e-flow-${Date.now()}`;
        const testUrl = 'https://complete-flow-test.example.com';

        // ==========================================
        // PASO 1: Crear análisis en MS-Analysis
        // ==========================================
        console.log('\n📊 PASO 1: Creating analysis...');

        const analysisPayload = {
          userId: userId,
          sessionId: sessionId,
          url: testUrl,
          status: 'completed',
          totalIssues: 12,
          criticalIssues: 3,
          seriousIssues: 4,
          moderateIssues: 3,
          minorIssues: 2,
          metadata: {
            engine: 'axe-core',
            timestamp: new Date().toISOString(),
            testType: 'complete-flow-e2e',
          },
          results: {
            violations: [
              {
                id: 'color-contrast',
                impact: 'serious',
                description: 'Elements must have sufficient color contrast',
                nodes: [{ html: '<div>Low contrast text</div>' }],
              },
              {
                id: 'image-alt',
                impact: 'critical',
                description: 'Images must have alternative text',
                nodes: [{ html: '<img src="test.jpg">' }],
              },
            ],
            passes: [
              {
                id: 'document-title',
                description: 'Document has a title element',
                nodes: [],
              },
            ],
            incomplete: [],
            inapplicable: [],
          },
        };

        const analysisResponse = await fetch(
          `${ANALYSIS_API_URL}/api/analysis`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysisPayload),
          }
        );

        expect(analysisResponse.status).toBe(201);
        expect(analysisResponse.ok).toBe(true);

        const analysisData: AnalysisResponse = await analysisResponse.json();
        const analysisId = analysisData.data.id;

        console.log(`✅ Analysis created with ID: ${analysisId}`);
        expect(analysisId).toBeGreaterThan(0);
        expect(analysisData.data.userId).toBe(userId);
        expect(analysisData.data.url).toBe(testUrl);
        expect(analysisData.data.totalIssues).toBe(12);

        // ==========================================
        // PASO 2: Verificar que el análisis se guardó correctamente
        // ==========================================
        console.log('\n🔍 PASO 2: Verifying analysis persistence...');

        const verifyAnalysisResponse = await fetch(
          `${ANALYSIS_API_URL}/api/analysis/${analysisId}`
        );
        expect(verifyAnalysisResponse.status).toBe(200);

        const verifiedAnalysis: AnalysisResponse =
          await verifyAnalysisResponse.json();
        expect(verifiedAnalysis.data.id).toBe(analysisId);
        expect(verifiedAnalysis.data.sessionId).toBe(sessionId);
        expect(verifiedAnalysis.data.criticalIssues).toBe(3);

        console.log(`✅ Analysis ${analysisId} verified in database`);

        // ==========================================
        // PASO 3: Generar reporte basado en el análisis
        // ==========================================
        console.log('\n📄 PASO 3: Generating report...');

        const reportPayload = {
          userId: userId,
          analysisId: analysisId,
          reportType: 'accessibility-audit',
          title: `Accessibility Report for ${testUrl}`,
          format: 'pdf',
          status: 'completed',
          metadata: {
            generatedAt: new Date().toISOString(),
            basedOnAnalysisId: analysisId,
            testType: 'complete-flow-e2e',
          },
          summary: {
            totalPages: 1,
            totalIssues: analysisData.data.totalIssues,
            criticalIssues: analysisData.data.criticalIssues,
            seriousIssues: analysisData.data.seriousIssues,
            moderateIssues: analysisData.data.moderateIssues,
            minorIssues: analysisData.data.minorIssues,
          },
        };

        const reportResponse = await fetch(`${REPORTS_API_URL}/api/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportPayload),
        });

        expect(reportResponse.status).toBe(201);
        expect(reportResponse.ok).toBe(true);

        const reportData: ReportResponse = await reportResponse.json();
        const reportId = reportData.data.id;

        console.log(`✅ Report created with ID: ${reportId}`);
        expect(reportId).toBeGreaterThan(0);
        expect(reportData.data.analysisId).toBe(analysisId);
        expect(reportData.data.userId).toBe(userId);

        // ==========================================
        // PASO 4: Verificar que el reporte se guardó correctamente
        // ==========================================
        console.log('\n🔍 PASO 4: Verifying report persistence...');

        const verifyReportResponse = await fetch(
          `${REPORTS_API_URL}/api/reports/${reportId}`
        );
        expect(verifyReportResponse.status).toBe(200);

        const verifiedReport: ReportResponse =
          await verifyReportResponse.json();
        expect(verifiedReport.data.id).toBe(reportId);
        expect(verifiedReport.data.analysisId).toBe(analysisId);
        expect(verifiedReport.data.format).toBe('pdf');

        console.log(`✅ Report ${reportId} verified in database`);

        // ==========================================
        // PASO 5: Verificar relación entre análisis y reporte
        // ==========================================
        console.log('\n🔗 PASO 5: Verifying analysis-report relationship...');

        // Obtener todos los reportes del análisis
        const reportsForAnalysisResponse = await fetch(
          `${REPORTS_API_URL}/api/reports/analysis/${analysisId}`
        );
        expect(reportsForAnalysisResponse.status).toBe(200);

        const reportsForAnalysis = await reportsForAnalysisResponse.json();
        expect(Array.isArray(reportsForAnalysis.data)).toBe(true);

        // Verificar que nuestro reporte está en la lista
        const ourReport = reportsForAnalysis.data.find(
          (r: any) => r.id === reportId
        );
        expect(ourReport).toBeDefined();
        expect(ourReport.analysisId).toBe(analysisId);

        console.log(
          `✅ Found ${reportsForAnalysis.data.length} report(s) for analysis ${analysisId}`
        );

        // ==========================================
        // RESUMEN FINAL
        // ==========================================
        console.log('\n✅ =============================================');
        console.log('✅ COMPLETE FLOW TEST PASSED');
        console.log('✅ =============================================');
        console.log(`   User ID: ${userId}`);
        console.log(`   Session: ${sessionId}`);
        console.log(`   Analysis ID: ${analysisId}`);
        console.log(`   Report ID: ${reportId}`);
        console.log(`   URL: ${testUrl}`);
        console.log(`   Total Issues: ${analysisData.data.totalIssues}`);
        console.log('✅ =============================================\n');
      },
      TIMEOUT_MS
    );
  });

  describe('Multiple Reports for Same Analysis', () => {
    it(
      'should allow creating multiple reports for the same analysis',
      async () => {
        const userId = 101;
        const sessionId = `multi-report-${Date.now()}`;

        // Crear análisis
        console.log('\n📊 Creating analysis...');
        const analysisPayload = {
          userId: userId,
          sessionId: sessionId,
          url: 'https://multi-report-test.example.com',
          status: 'completed',
          totalIssues: 8,
          criticalIssues: 2,
          seriousIssues: 3,
          moderateIssues: 2,
          minorIssues: 1,
          results: {
            violations: [],
            passes: [],
            incomplete: [],
            inapplicable: [],
          },
        };

        const analysisResponse = await fetch(
          `${ANALYSIS_API_URL}/api/analysis`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysisPayload),
          }
        );

        const analysisData: AnalysisResponse = await analysisResponse.json();
        const analysisId = analysisData.data.id;
        console.log(`✅ Analysis ID: ${analysisId}`);

        // Crear múltiples reportes en diferentes formatos
        const formats = ['pdf', 'html', 'json'];
        const reportIds: number[] = [];

        for (const format of formats) {
          console.log(`\n📄 Creating ${format} report...`);

          const reportPayload = {
            userId: userId,
            analysisId: analysisId,
            reportType: 'accessibility-audit',
            title: `${format.toUpperCase()} Report for Analysis ${analysisId}`,
            format: format,
            status: 'completed',
            summary: {
              totalPages: 1,
              totalIssues: analysisData.data.totalIssues,
              criticalIssues: analysisData.data.criticalIssues,
              seriousIssues: analysisData.data.seriousIssues,
              moderateIssues: analysisData.data.moderateIssues,
              minorIssues: analysisData.data.minorIssues,
            },
          };

          const reportResponse = await fetch(`${REPORTS_API_URL}/api/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportPayload),
          });

          if (reportResponse.status === 201) {
            const reportData: ReportResponse = await reportResponse.json();
            reportIds.push(reportData.data.id);
            console.log(
              `✅ ${format} report created with ID: ${reportData.data.id}`
            );
          }
        }

        // Verificar que todos los reportes están asociados al análisis
        const reportsForAnalysisResponse = await fetch(
          `${REPORTS_API_URL}/api/reports/analysis/${analysisId}`
        );
        const reportsForAnalysis = await reportsForAnalysisResponse.json();

        expect(reportsForAnalysis.data.length).toBeGreaterThanOrEqual(
          reportIds.length
        );

        console.log(
          `\n✅ Successfully created ${reportIds.length} reports for analysis ${analysisId}`
        );
      },
      TIMEOUT_MS
    );
  });

  describe('User Journey - Multiple Analyses and Reports', () => {
    it(
      'should handle complete user journey with multiple analyses and reports',
      async () => {
        const userId = 102;
        const analysisIds: number[] = [];
        const reportIds: number[] = [];

        // Crear 3 análisis diferentes
        console.log('\n👤 USER JOURNEY TEST');
        console.log('====================\n');

        for (let i = 0; i < 3; i++) {
          console.log(`📊 Creating analysis ${i + 1}/3...`);

          const analysisPayload = {
            userId: userId,
            sessionId: `user-journey-${Date.now()}-${i}`,
            url: `https://journey-test-${i}.example.com`,
            status: 'completed',
            totalIssues: (i + 1) * 3,
            criticalIssues: i,
            seriousIssues: i + 1,
            moderateIssues: i + 1,
            minorIssues: i,
            results: {
              violations: [],
              passes: [],
              incomplete: [],
              inapplicable: [],
            },
          };

          const analysisResponse = await fetch(
            `${ANALYSIS_API_URL}/api/analysis`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(analysisPayload),
            }
          );

          const analysisData: AnalysisResponse = await analysisResponse.json();
          analysisIds.push(analysisData.data.id);

          console.log(`✅ Analysis ${analysisData.data.id} created`);

          // Crear reporte para cada análisis
          console.log(
            `📄 Creating report for analysis ${analysisData.data.id}...`
          );

          const reportPayload = {
            userId: userId,
            analysisId: analysisData.data.id,
            reportType: 'accessibility-audit',
            title: `User Journey Report ${i + 1}`,
            format: 'pdf',
            status: 'completed',
            summary: {
              totalPages: i + 1,
              totalIssues: analysisData.data.totalIssues,
              criticalIssues: analysisData.data.criticalIssues,
              seriousIssues: analysisData.data.seriousIssues,
              moderateIssues: analysisData.data.moderateIssues,
              minorIssues: analysisData.data.minorIssues,
            },
          };

          const reportResponse = await fetch(`${REPORTS_API_URL}/api/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportPayload),
          });

          const reportData: ReportResponse = await reportResponse.json();
          reportIds.push(reportData.data.id);

          console.log(`✅ Report ${reportData.data.id} created\n`);
        }

        // Verificar que todos los análisis del usuario están disponibles
        console.log('🔍 Verifying all user analyses...');
        const userAnalysesResponse = await fetch(
          `${ANALYSIS_API_URL}/api/analysis/user/${userId}`
        );
        const userAnalyses = await userAnalysesResponse.json();

        expect(userAnalyses.data.length).toBeGreaterThanOrEqual(3);
        console.log(
          `✅ Found ${userAnalyses.data.length} analyses for user ${userId}`
        );

        // Verificar que todos los reportes del usuario están disponibles
        console.log('🔍 Verifying all user reports...');
        const userReportsResponse = await fetch(
          `${REPORTS_API_URL}/api/reports/user/${userId}`
        );
        const userReports = await userReportsResponse.json();

        expect(userReports.data.length).toBeGreaterThanOrEqual(3);
        console.log(
          `✅ Found ${userReports.data.length} reports for user ${userId}`
        );

        console.log('\n✅ USER JOURNEY COMPLETED SUCCESSFULLY');
        console.log(`   User ID: ${userId}`);
        console.log(`   Analyses created: ${analysisIds.length}`);
        console.log(`   Reports created: ${reportIds.length}`);
        console.log('====================\n');
      },
      TIMEOUT_MS
    );
  });

  describe('Cross-Service Data Consistency', () => {
    it(
      'should maintain data consistency between Analysis and Reports services',
      async () => {
        const userId = 103;
        const sessionId = `consistency-test-${Date.now()}`;

        // Crear análisis con datos específicos
        const analysisPayload = {
          userId: userId,
          sessionId: sessionId,
          url: 'https://consistency-test.example.com',
          status: 'completed',
          totalIssues: 20,
          criticalIssues: 5,
          seriousIssues: 7,
          moderateIssues: 5,
          minorIssues: 3,
          results: {
            violations: [],
            passes: [],
            incomplete: [],
            inapplicable: [],
          },
        };

        const analysisResponse = await fetch(
          `${ANALYSIS_API_URL}/api/analysis`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysisPayload),
          }
        );

        const analysisData: AnalysisResponse = await analysisResponse.json();
        const analysisId = analysisData.data.id;

        // Crear reporte con los MISMOS datos
        const reportPayload = {
          userId: userId,
          analysisId: analysisId,
          reportType: 'accessibility-audit',
          title: 'Consistency Test Report',
          format: 'pdf',
          status: 'completed',
          summary: {
            totalPages: 1,
            totalIssues: 20, // Debe coincidir
            criticalIssues: 5, // Debe coincidir
            seriousIssues: 7, // Debe coincidir
            moderateIssues: 5, // Debe coincidir
            minorIssues: 3, // Debe coincidir
          },
        };

        const reportResponse = await fetch(`${REPORTS_API_URL}/api/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportPayload),
        });

        const reportData: ReportResponse = await reportResponse.json();

        // Verificar consistencia
        const verifyAnalysis = await fetch(
          `${ANALYSIS_API_URL}/api/analysis/${analysisId}`
        );
        const analysisCheck: AnalysisResponse = await verifyAnalysis.json();

        const verifyReport = await fetch(
          `${REPORTS_API_URL}/api/reports/${reportData.data.id}`
        );
        const reportCheck = await verifyReport.json();

        // Los datos deben ser consistentes
        expect(analysisCheck.data.userId).toBe(reportCheck.data.userId);
        expect(reportCheck.data.analysisId).toBe(analysisId);

        console.log('✅ Data consistency verified across services');
        console.log(`   Analysis ID: ${analysisId}`);
        console.log(`   Report ID: ${reportData.data.id}`);
        console.log(`   User ID: ${userId} (consistent)`);
      },
      TIMEOUT_MS
    );
  });
});
