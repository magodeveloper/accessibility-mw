const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
    sort(tests) {
        // Separar tests unitarios e integración
        const unitTests = tests.filter(test => test.path.includes('/unit/'));
        const integrationTests = tests.filter(test => test.path.includes('/integration/'));

        // Ejecutar primero tests unitarios, luego integración
        return [...unitTests, ...integrationTests];
    }
}

module.exports = CustomSequencer;
