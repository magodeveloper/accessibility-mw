import {
  LRUCache,
  analysisCache,
  getCacheKey,
} from '../../src/services/cache.service';

// Mock para TextEncoder
global.TextEncoder = jest.fn(() => ({
  encode: jest.fn((str: string) => new Uint8Array(str.length)),
})) as any;

// Mock para console methods
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;
const mockConsoleWarn = jest.fn();
const mockConsoleLog = jest.fn();

describe('Cache Service', () => {
  let cache: LRUCache<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = mockConsoleWarn;
    console.log = mockConsoleLog;

    // Crear nueva instancia para cada test
    cache = new LRUCache<any>(3, 1); // maxSize=3, maxMemoryMB=1

    // Mock para Date.now para control de tiempo
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
    jest.restoreAllMocks();
  });

  describe('Constructor y configuración', () => {
    it('debe crear cache con valores por defecto', () => {
      const defaultCache = new LRUCache();
      const stats = defaultCache.getStats();

      expect(stats.entries).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.memoryUsageMB).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('debe crear cache con configuración personalizada', () => {
      const customCache = new LRUCache(50, 25);
      const stats = customCache.getStats();

      expect(stats.entries).toBe(0);
      expect(customCache.getStats().memoryUsageMB).toBe(0);
    });

    it('debe configurar limpieza automática periódica', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      new LRUCache(5, 2);

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5 minutos
      );

      setIntervalSpy.mockRestore();
    });
  });

  describe('Operaciones básicas', () => {
    it('debe almacenar y recuperar valores correctamente', () => {
      const testData = { message: 'test data' };

      cache.set('html', '<div>test</div>', testData, 30);
      const result = cache.get('html', '<div>test</div>');

      expect(result).toEqual(testData);
    });

    it('debe retornar null para claves inexistentes', () => {
      const result = cache.get('html', '<div>nonexistent</div>');

      expect(result).toBeNull();
    });

    it('debe verificar existencia de claves correctamente', () => {
      const testData = { message: 'test' };

      cache.set('html', '<div>test</div>', testData);

      expect(cache.has('html', '<div>test</div>')).toBe(true);
      expect(cache.has('html', '<div>nonexistent</div>')).toBe(false);
    });

    it('debe limpiar todo el cache', () => {
      cache.set('html', '<div>test1</div>', { data: '1' });
      cache.set('html', '<div>test2</div>', { data: '2' });

      cache.clear();

      expect(cache.get('html', '<div>test1</div>')).toBeNull();
      expect(cache.get('html', '<div>test2</div>')).toBeNull();

      const stats = cache.getStats();
      expect(stats.entries).toBe(0);
      expect(stats.memoryUsageMB).toBe(0);
    });

    it('debe manejar opciones en claves', () => {
      const options = { wcag: '2.1', level: 'AA' };
      const testData = { issues: [] };

      cache.set('html', '<div>test</div>', testData, 30, options);

      // Con opciones correctas
      expect(cache.get('html', '<div>test</div>', options)).toEqual(testData);

      // Sin opciones (clave diferente)
      expect(cache.get('html', '<div>test</div>')).toBeNull();

      // Con opciones diferentes (clave diferente)
      expect(cache.get('html', '<div>test</div>', { wcag: '2.2' })).toBeNull();
    });
  });

  describe('LRU Behavior (Least Recently Used)', () => {
    it('debe evitar el elemento menos usado cuando se alcanza el límite', () => {
      // Llenar cache hasta el límite (maxSize=3)
      cache.set('html', '<div>first</div>', { id: 1 });
      cache.set('html', '<div>second</div>', { id: 2 });
      cache.set('html', '<div>third</div>', { id: 3 });

      // Agregar cuarto elemento - debe eliminar el primero
      cache.set('html', '<div>fourth</div>', { id: 4 });

      expect(cache.get('html', '<div>first</div>')).toBeNull(); // Evicted
      expect(cache.get('html', '<div>second</div>')).toEqual({ id: 2 });
      expect(cache.get('html', '<div>third</div>')).toEqual({ id: 3 });
      expect(cache.get('html', '<div>fourth</div>')).toEqual({ id: 4 });
    });

    it('debe mover elementos al final cuando se acceden (LRU update)', () => {
      cache.set('html', '<div>first</div>', { id: 1 });
      cache.set('html', '<div>second</div>', { id: 2 });
      cache.set('html', '<div>third</div>', { id: 3 });

      // Acceder al primer elemento (lo mueve al final)
      cache.get('html', '<div>first</div>');

      // Agregar cuarto elemento - debe eliminar el segundo (ahora el más viejo)
      cache.set('html', '<div>fourth</div>', { id: 4 });

      expect(cache.get('html', '<div>first</div>')).toEqual({ id: 1 }); // Still exists
      expect(cache.get('html', '<div>second</div>')).toBeNull(); // Evicted
      expect(cache.get('html', '<div>third</div>')).toEqual({ id: 3 });
      expect(cache.get('html', '<div>fourth</div>')).toEqual({ id: 4 });
    });

    it('debe actualizar entrada existente sin crear duplicado', () => {
      cache.set('html', '<div>test</div>', { version: 1 });
      cache.set('html', '<div>test</div>', { version: 2 }); // Update

      expect(cache.get('html', '<div>test</div>')).toEqual({ version: 2 });

      const stats = cache.getStats();
      expect(stats.entries).toBe(1); // Solo una entrada
    });
  });

  describe('TTL (Time To Live) y expiración', () => {
    it('debe expirar entradas después del TTL', () => {
      cache.set('html', '<div>test</div>', { data: 'test' }, 1); // 1 minuto

      // Avanzar tiempo por 30 segundos - no debe expirar
      jest.spyOn(Date, 'now').mockReturnValue(1000000 + 30 * 1000);
      expect(cache.get('html', '<div>test</div>')).toEqual({ data: 'test' });

      // Avanzar tiempo por 2 minutos - debe expirar
      jest.spyOn(Date, 'now').mockReturnValue(1000000 + 2 * 60 * 1000);
      expect(cache.get('html', '<div>test</div>')).toBeNull();
    });

    it('debe limpiar memoria cuando se elimina entrada expirada', () => {
      cache.set('html', '<div>test</div>', { largeData: 'x'.repeat(1000) }, 1);

      const initialStats = cache.getStats();
      expect(initialStats.memoryUsageMB).toBeGreaterThan(0);

      // Expirar entrada
      jest.spyOn(Date, 'now').mockReturnValue(1000000 + 2 * 60 * 1000);
      cache.get('html', '<div>test</div>'); // Triggers expiration cleanup

      const finalStats = cache.getStats();
      expect(finalStats.memoryUsageMB).toBe(0);
      expect(finalStats.entries).toBe(0);
    });

    it('debe usar TTL personalizado por entrada', () => {
      cache.set('html', '<div>short</div>', { data: 'short' }, 1); // 1 min
      cache.set('html', '<div>long</div>', { data: 'long' }, 10); // 10 min

      // Avanzar tiempo por 2 minutos
      jest.spyOn(Date, 'now').mockReturnValue(1000000 + 2 * 60 * 1000);

      expect(cache.get('html', '<div>short</div>')).toBeNull(); // Expired
      expect(cache.get('html', '<div>long</div>')).toEqual({ data: 'long' }); // Still valid
    });
  });

  describe('Memory Management', () => {
    it('debe rechazar entradas muy grandes', () => {
      const largeData = { content: 'x'.repeat(300 * 1024) }; // ~300KB

      cache.set('html', '<div>large</div>', largeData);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[Cache] Entry too large')
      );
      expect(cache.get('html', '<div>large</div>')).toBeNull();
    });

    it('debe evitar entradas cuando se alcanza límite de memoria', () => {
      // Crear cache con límite muy pequeño
      const smallCache = new LRUCache<any>(10, 0.001); // 0.001MB = ~1KB

      // Llenar con datos pequeños primero
      smallCache.set('html', '<div>1</div>', { data: '1'.repeat(100) });
      smallCache.set('html', '<div>2</div>', { data: '2'.repeat(100) });

      // Intentar agregar más datos - debe evitar los anteriores
      smallCache.set('html', '<div>3</div>', { data: '3'.repeat(500) });

      const stats = smallCache.getStats();
      expect(stats.entries).toBeLessThanOrEqual(2); // Algunas entradas fueron evicted
    });

    it('debe calcular tamaño correctamente', () => {
      const smallData = { msg: 'hi' };
      const largeData = { msg: 'x'.repeat(1000) };

      cache.set('html', '<div>small</div>', smallData);
      cache.set('html', '<div>large</div>', largeData);

      const stats = cache.getStats();
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
      expect(stats.entries).toBe(2);
    });

    it('debe manejar error en calculateSize con fallback', () => {
      // Crear objeto que cause error en JSON.stringify
      const circularRef: any = { data: 'test' };
      circularRef.self = circularRef;

      cache.set('html', '<div>circular</div>', circularRef);

      // Debe usar fallback de 1000 bytes
      const stats = cache.getStats();
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
    });
  });

  describe('Statistics Tracking', () => {
    it('debe rastrear hits y misses correctamente', () => {
      cache.set('html', '<div>test</div>', { data: 'test' });

      // Hit
      cache.get('html', '<div>test</div>');
      cache.get('html', '<div>test</div>');

      // Miss
      cache.get('html', '<div>nonexistent</div>');

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(2 / 3);
    });

    it('debe calcular hit rate correctamente', () => {
      // Sin datos
      let stats = cache.getStats();
      expect(stats.hitRate).toBe(0);

      cache.set('html', '<div>test</div>', { data: 'test' });

      // Solo hits
      cache.get('html', '<div>test</div>');
      cache.get('html', '<div>test</div>');

      stats = cache.getStats();
      expect(stats.hitRate).toBe(1); // 100%

      // Agregar miss
      cache.get('html', '<div>missing</div>');

      stats = cache.getStats();
      expect(stats.hitRate).toBe(2 / 3); // 66.7%
    });

    it('debe reportar estadísticas de memoria correctamente', () => {
      const data = { content: 'x'.repeat(500) };
      cache.set('html', '<div>test</div>', data);

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toBe(1);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
      expect(stats.memoryUsage).toBe(stats.memoryUsageMB * 1024 * 1024);
    });
  });

  describe('Cleanup automática', () => {
    it('debe limpiar entradas expiradas automáticamente', () => {
      // Mock del environment para mostrar cleanup logs
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      cache.set('html', '<div>test1</div>', { data: '1' }, 1);
      cache.set('html', '<div>test2</div>', { data: '2' }, 10);

      // Avanzar tiempo para que expire la primera entrada
      jest.spyOn(Date, 'now').mockReturnValue(1000000 + 2 * 60 * 1000);

      // Simular cleanup automática (acceder al método privado via any)
      (cache as any).cleanup();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Cache] Cleaned up 1 expired entries'
      );

      expect(cache.get('html', '<div>test1</div>')).toBeNull();
      expect(cache.get('html', '<div>test2</div>')).toEqual({ data: '2' });

      process.env.NODE_ENV = originalEnv;
    });

    it('no debe mostrar logs de cleanup en producción', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      cache.set('html', '<div>test</div>', { data: 'test' }, 1);

      // Expirar entrada
      jest.spyOn(Date, 'now').mockReturnValue(1000000 + 2 * 60 * 1000);
      (cache as any).cleanup();

      expect(mockConsoleLog).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('debe manejar cleanup sin entradas expiradas', () => {
      cache.set('html', '<div>test</div>', { data: 'test' }, 10);

      // No avanzar tiempo - entrada no debe expirar
      (cache as any).cleanup();

      expect(cache.get('html', '<div>test</div>')).toEqual({ data: 'test' });
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('Helper Functions', () => {
    it('getCacheKey debe generar claves consistentes', () => {
      const key1 = getCacheKey('html', '<div>test</div>', 'axe-core', {
        wcag: '2.1',
      });
      const key2 = getCacheKey('html', '<div>test</div>', 'axe-core', {
        wcag: '2.1',
      });
      const key3 = getCacheKey('html', '<div>test</div>', 'axe-core', {
        wcag: '2.2',
      });

      expect(key1).toBe(key2); // Mismos parámetros = misma clave
      expect(key1).not.toBe(key3); // Diferentes opciones = clave diferente
    });

    it('getCacheKey debe manejar opciones vacías', () => {
      const key1 = getCacheKey('html', '<div>test</div>', 'axe-core');
      const key2 = getCacheKey('html', '<div>test</div>', 'axe-core', {});

      expect(typeof key1).toBe('string');
      expect(typeof key2).toBe('string');
    });
  });

  describe('Cache Global', () => {
    it('analysisCache debe ser una instancia de LRUCache', () => {
      expect(analysisCache).toBeInstanceOf(LRUCache);
    });

    it('analysisCache debe funcionar con configuración del environment', () => {
      // Testear que usa variables de environment o defaults
      const stats = analysisCache.getStats();
      expect(stats.entries).toBe(0);
      expect(stats.memoryUsageMB).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('debe manejar valores null y undefined', () => {
      cache.set('html', '<div>null</div>', null);
      cache.set('html', '<div>undefined</div>', undefined);

      expect(cache.get('html', '<div>null</div>')).toBeNull();
      expect(cache.get('html', '<div>undefined</div>')).toBeUndefined();
    });

    it('debe manejar strings vacíos y objetos vacíos', () => {
      cache.set('html', '', { data: 'empty-key' });
      cache.set('html', '<div>test</div>', {});

      expect(cache.get('html', '')).toEqual({ data: 'empty-key' });
      expect(cache.get('html', '<div>test</div>')).toEqual({});
    });

    it('debe manejar números grandes y arrays', () => {
      const testArray = [1, 2, 3, { nested: 'object' }];
      const bigNumber = Number.MAX_SAFE_INTEGER;

      cache.set('html', '<div>array</div>', testArray);
      cache.set('html', '<div>number</div>', bigNumber);

      expect(cache.get('html', '<div>array</div>')).toEqual(testArray);
      expect(cache.get('html', '<div>number</div>')).toBe(bigNumber);
    });

    it('debe manejar caracteres especiales en claves', () => {
      const specialChars = '<script>alert("xss")</script>';
      const unicode = '🚀 测试 データ';

      cache.set('html', specialChars, { type: 'xss' });
      cache.set('html', unicode, { type: 'unicode' });

      expect(cache.get('html', specialChars)).toEqual({ type: 'xss' });
      expect(cache.get('html', unicode)).toEqual({ type: 'unicode' });
    });
  });
});
