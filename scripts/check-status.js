const http = require('http');

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 8082,
            path: path,
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve(json);
                } catch (e) {
                    resolve(body);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function checkStatus() {
    console.log('📊 Estado actual del microservicio:\n');

    try {
        const analysis = await makeRequest('/api/Analysis');
        console.log(`📈 Análisis: ${analysis?.length || 0}`);
        if (analysis && analysis.length > 0) {
            console.log(`   Últimos 3:`);
            analysis.slice(-3).forEach((a, i) => {
                console.log(`   ${i + 1}. ID ${a.id} - ${a.sourceUrl} (${a.status})`);
            });
        }

        const results = await makeRequest('/api/Result');
        console.log(`\n📊 Results: ${results?.length || 0}`);
        if (results && results.length > 0) {
            console.log(`   Últimos 3:`);
            results.slice(-3).forEach((r, i) => {
                console.log(`   ${i + 1}. ID ${r.id} - ${r.wcagCriterion} (${r.level}) - Analysis ${r.analysisId}`);
            });
        }

        const errors = await makeRequest('/api/Error');
        console.log(`\n❌ Errors: ${errors?.length || 0}`);
        if (errors && errors.length > 0) {
            console.log(`   Últimos 3:`);
            errors.slice(-3).forEach((e, i) => {
                console.log(`   ${i + 1}. ID ${e.id} - ${e.criterion} (${e.type}) - Analysis ${e.analysisId}`);
            });
        }

        console.log('\n✅ Estado verificado!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkStatus();
