import express, { Express } from 'express';
import { Server, createServer } from 'http';
import { AddressInfo } from 'net';

/**
 * Helper para crear servidores de test con puertos dinámicos
 */
export class TestServer {
  private server: Server | null = null;
  private port: number = 0;
  private app: Express;
  private forceCloseTimeout: NodeJS.Timeout | null = null;

  constructor(app?: Express) {
    this.app = app || express();
  }

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      // Crear servidor con puerto 0 (puerto dinámico)
      this.server = createServer(this.app);

      this.server.listen(0, '127.0.0.1', () => {
        const address = this.server!.address() as AddressInfo;
        this.port = address.port;
        console.log(`Test server started on port ${this.port}`);
        resolve(this.port);
      });

      this.server.on('error', error => {
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise(resolve => {
      // Limpiar timeout existente si lo hay
      if (this.forceCloseTimeout) {
        clearTimeout(this.forceCloseTimeout);
        this.forceCloseTimeout = null;
      }

      if (this.server && this.server.listening) {
        let resolved = false;

        this.server.close(() => {
          if (!resolved) {
            resolved = true;
            console.log(`Test server stopped (port ${this.port})`);
            resolve();
          }
        });

        // Force close after timeout con referencia almacenada
        this.forceCloseTimeout = setTimeout(() => {
          if (this.server && this.server.listening && !resolved) {
            resolved = true;
            this.server.closeAllConnections?.();
            resolve();
          }
          // Limpiar la referencia del timeout
          this.forceCloseTimeout = null;
        }, 5000);

        // Usar .unref() para evitar que Jest detecte el timeout como open handle
        this.forceCloseTimeout.unref();
      } else {
        resolve();
      }
    });
  }

  /**
   * Limpia explícitamente todos los timers y conexiones
   */
  cleanup(): void {
    if (this.forceCloseTimeout) {
      clearTimeout(this.forceCloseTimeout);
      this.forceCloseTimeout = null;
    }
  }

  getPort(): number {
    return this.port;
  }

  getBaseUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  getApp(): Express {
    return this.app;
  }
}

/**
 * Helper para detectar si un puerto está en uso
 */
export async function isPortInUse(port: number): Promise<boolean> {
  return new Promise(resolve => {
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
export async function findFreePort(startPort: number = 3002): Promise<number> {
  let port = startPort;
  while (await isPortInUse(port)) {
    port++;
    if (port > 65535) {
      throw new Error('No free ports available');
    }
  }
  return port;
}
