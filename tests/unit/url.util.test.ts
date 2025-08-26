import { validateUrl } from '../../src/utils/url.util';

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
});
