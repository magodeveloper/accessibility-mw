import { createHash } from 'crypto';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  size: number; // tamaño estimado en bytes
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
  memoryUsage: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private maxMemoryMB: number;
  private currentMemoryBytes = 0;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    entries: 0,
    memoryUsage: 0,
  };

  constructor(maxSize = 100, maxMemoryMB = 50) {
    this.maxSize = maxSize;
    this.maxMemoryMB = maxMemoryMB;

    // Limpieza periódica cada 5 minutos
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private calculateSize(value: T): number {
    try {
      return new TextEncoder().encode(JSON.stringify(value)).length;
    } catch {
      return 1000; // Fallback estimado
    }
  }

  private createKey(
    inputType: string,
    value: string,
    options: Record<string, unknown> = {}
  ): string {
    const hash = createHash('md5');
    hash.update(JSON.stringify({ inputType, value, options }));
    return hash.digest('hex');
  }

  set(
    inputType: string,
    value: string,
    result: T,
    ttlMinutes = 30,
    options: Record<string, unknown> = {}
  ): void {
    const key = this.createKey(inputType, value, options);
    const size = this.calculateSize(result);
    const maxMemoryBytes = this.maxMemoryMB * 1024 * 1024;

    // Verificar límites de memoria
    if (size > maxMemoryBytes / 4) {
      console.warn(
        `[Cache] Entry too large: ${Math.round(size / 1024)}KB, skipping cache`
      );
      return;
    }

    // Limpiar espacio si es necesario
    while (
      (this.cache.size >= this.maxSize ||
        this.currentMemoryBytes + size > maxMemoryBytes) &&
      this.cache.size > 0
    ) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      value: result,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000,
      size,
    };

    // Remover entrada anterior si existe
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.currentMemoryBytes -= oldEntry.size;
    }

    this.cache.set(key, entry);
    this.currentMemoryBytes += size;
    this.updateStats();
  }

  get(
    inputType: string,
    value: string,
    options: Record<string, unknown> = {}
  ): T | null {
    const key = this.createKey(inputType, value, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Verificar expiración
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.currentMemoryBytes -= entry.size;
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    this.stats.hits++;

    // Mover al final (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.cache.delete(oldestKey);
      this.currentMemoryBytes -= entry.size;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      const entry = this.cache.get(key)!;
      this.cache.delete(key);
      this.currentMemoryBytes -= entry.size;
    }

    if (toDelete.length > 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Cache] Cleaned up ${toDelete.length} expired entries`);
      }
      this.updateStats();
    }
  }

  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.entries = this.cache.size;
    this.stats.memoryUsage = this.currentMemoryBytes;
  }

  getStats(): CacheStats & { hitRate: number; memoryUsageMB: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      memoryUsageMB: this.currentMemoryBytes / (1024 * 1024),
    };
  }

  clear(): void {
    this.cache.clear();
    this.currentMemoryBytes = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
      memoryUsage: 0,
    };
  }

  has(
    inputType: string,
    value: string,
    options: Record<string, unknown> = {}
  ): boolean {
    return this.get(inputType, value, options) !== null;
  }
}

// Cache global para resultados de análisis
export const analysisCache = new LRUCache<unknown>(
  Number(process.env.CACHE_MAX_ENTRIES ?? 100),
  Number(process.env.CACHE_MAX_MEMORY_MB ?? 50)
);

// Función helper para usar caché en análisis
export function getCacheKey(
  inputType: string,
  value: string,
  tool: string,
  options: Record<string, unknown> = {}
): string {
  return JSON.stringify({ inputType, value, tool, ...options });
}

// Limpieza al cerrar aplicación
// Event listeners comentados - el manejo de señales se hace en server.ts
// process.on('SIGINT', () => {
//   if (process.env.NODE_ENV !== 'production') {
//     console.log('Clearing analysis cache...');
//   }
//   analysisCache.clear();
// });

// process.on('SIGTERM', () => {
//   if (process.env.NODE_ENV !== 'production') {
//     console.log('Clearing analysis cache...');
//   }
//   analysisCache.clear();
// });
