"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestServer = void 0;
exports.isPortInUse = isPortInUse;
exports.findFreePort = findFreePort;
const tslib_1 = require("tslib");
const http_1 = require("http");
const express_1 = tslib_1.__importDefault(require("express"));
/**
 * Helper para crear servidores de test con puertos dinámicos
 */
class TestServer {
    constructor(app) {
        this.server = null;
        this.port = 0;
        this.app = app || (0, express_1.default)();
    }
    async start() {
        return new Promise((resolve, reject) => {
            // Crear servidor con puerto 0 (puerto dinámico)
            this.server = (0, http_1.createServer)(this.app);
            this.server.listen(0, '127.0.0.1', () => {
                const address = this.server.address();
                this.port = address.port;
                console.log(`Test server started on port ${this.port}`);
                resolve(this.port);
            });
            this.server.on('error', (error) => {
                reject(error);
            });
        });
    }
    async stop() {
        return new Promise((resolve) => {
            if (this.server && this.server.listening) {
                this.server.close(() => {
                    console.log(`Test server stopped (port ${this.port})`);
                    resolve();
                });
                // Force close after timeout
                setTimeout(() => {
                    if (this.server && this.server.listening) {
                        this.server.closeAllConnections?.();
                        resolve();
                    }
                }, 5000);
            }
            else {
                resolve();
            }
        });
    }
    getPort() {
        return this.port;
    }
    getBaseUrl() {
        return `http://127.0.0.1:${this.port}`;
    }
    getApp() {
        return this.app;
    }
}
exports.TestServer = TestServer;
/**
 * Helper para detectar si un puerto está en uso
 */
async function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = require('net').createServer();
        server.listen(port, '127.0.0.1', () => {
            server.close(() => resolve(false));
        });
        server.on('error', () => resolve(true));
    });
}
/**
 * Helper para encontrar un puerto libre
 */
async function findFreePort(startPort = 3002) {
    let port = startPort;
    while (await isPortInUse(port)) {
        port++;
        if (port > 65535) {
            throw new Error('No free ports available');
        }
    }
    return port;
}
