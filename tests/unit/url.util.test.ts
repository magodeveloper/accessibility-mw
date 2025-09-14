import {
  extractDomain,
  normalizeUrl,
  validateUrl,
} from '../../src/utils/url.util';

describe('URL Utility Tests', () => {
  describe('validateUrl', () => {
    it('debe validar URLs HTTP válidas', () => {
      expect(validateUrl('http://example.com')).toBe(true);
      expect(validateUrl('http://www.google.com')).toBe(true);
      expect(validateUrl('http://localhost:3000')).toBe(true);
    });

    it('debe validar URLs HTTPS válidas', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('https://www.google.com')).toBe(true);
      expect(validateUrl('https://github.com/user/repo')).toBe(true);
    });

    it('debe rechazar URLs inválidas', () => {
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('invalid-url')).toBe(false);
      expect(validateUrl('')).toBe(false);
      expect(validateUrl('javascript:alert(1)')).toBe(false);
    });

    it('debe manejar casos edge', () => {
      expect(validateUrl(null as any)).toBe(false);
      expect(validateUrl(undefined as any)).toBe(false);
      expect(validateUrl(123 as any)).toBe(false);
    });

    it('debe validar URLs con puertos personalizados', () => {
      expect(validateUrl('http://localhost:8080')).toBe(true);
      expect(validateUrl('https://example.com:9000')).toBe(true);
      expect(validateUrl('http://192.168.1.1:3000')).toBe(true);
    });

    it('debe validar URLs con paths complejos', () => {
      expect(validateUrl('https://example.com/path/to/page')).toBe(true);
      expect(validateUrl('https://example.com/path?query=value')).toBe(true);
      expect(validateUrl('https://example.com/path#section')).toBe(true);
      expect(
        validateUrl('https://example.com/path?query=value&other=test#section')
      ).toBe(true);
    });

    it('debe validar URLs con subdominios', () => {
      expect(validateUrl('https://api.example.com')).toBe(true);
      expect(validateUrl('https://sub.domain.example.com')).toBe(true);
      expect(validateUrl('https://test.api.example.com/v1/endpoint')).toBe(
        true
      );
    });

    it('debe manejar URLs con caracteres especiales', () => {
      expect(validateUrl('https://example.com/path%20with%20spaces')).toBe(
        true
      );
      expect(
        validateUrl('https://example.com/path?param=value%20with%20spaces')
      ).toBe(true);
    });
  });

  describe('normalizeUrl', () => {
    it('debe retornar string vacío para URL vacía', () => {
      expect(normalizeUrl('')).toBe('');
      expect(normalizeUrl(null as any)).toBe('');
      expect(normalizeUrl(undefined as any)).toBe('');
    });

    it('debe mantener URLs que ya tienen protocolo', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com');
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
      expect(normalizeUrl('https://www.google.com/search')).toBe(
        'https://www.google.com/search'
      );
    });

    it('debe agregar https:// a dominios válidos', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com');
      expect(normalizeUrl('www.google.com')).toBe('https://www.google.com');
      expect(normalizeUrl('api.github.com')).toBe('https://api.github.com');
    });

    it('debe mantener URLs sin punto o con espacios como están', () => {
      expect(normalizeUrl('localhost')).toBe('localhost');
      expect(normalizeUrl('invalid url with spaces')).toBe(
        'invalid url with spaces'
      );
      expect(normalizeUrl('test string')).toBe('test string');
    });

    it('debe manejar casos edge correctamente', () => {
      expect(normalizeUrl('file.txt')).toBe('https://file.txt');
      expect(normalizeUrl('domain.co.uk')).toBe('https://domain.co.uk');
      expect(normalizeUrl('sub.domain.example.org')).toBe(
        'https://sub.domain.example.org'
      );
    });
  });

  describe('extractDomain', () => {
    it('debe extraer dominio de URLs válidas', () => {
      expect(extractDomain('https://example.com')).toBe('example.com');
      expect(extractDomain('http://www.google.com')).toBe('www.google.com');
      expect(extractDomain('https://api.github.com/users')).toBe(
        'api.github.com'
      );
    });

    it('debe extraer dominio con puertos', () => {
      expect(extractDomain('http://localhost:3000')).toBe('localhost');
      expect(extractDomain('https://example.com:8080')).toBe('example.com');
    });

    it('debe retornar string vacío para URLs inválidas', () => {
      expect(extractDomain('invalid-url')).toBe('');
      expect(extractDomain('')).toBe('');
      expect(extractDomain('ftp://example.com')).toBe('');
      expect(extractDomain('javascript:alert(1)')).toBe('');
    });

    it('debe manejar casos edge', () => {
      expect(extractDomain(null as any)).toBe('');
      expect(extractDomain(undefined as any)).toBe('');
      expect(extractDomain('not-a-url')).toBe('');
    });

    it('debe manejar URLs malformadas', () => {
      expect(extractDomain('https://')).toBe('');
      expect(extractDomain('http://')).toBe('');
      expect(extractDomain('https://.')).toBe('.');
    });
  });
});
