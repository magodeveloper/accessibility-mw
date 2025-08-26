import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { attachRequestId } from '../../src/middlewares/requestId';

// Mock crypto module
jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

describe('RequestId Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {};
    nextFunction = jest.fn();
    (randomUUID as jest.Mock).mockReturnValue('mock-uuid-1234');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('attachRequestId', () => {
    it('debe generar un nuevo requestId cuando no existe', () => {
      attachRequestId(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.id).toBe('mock-uuid-1234');
      expect(randomUUID).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('debe conservar requestId existente', () => {
      mockRequest.id = 'existing-request-id';

      attachRequestId(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.id).toBe('existing-request-id');
      expect(randomUUID).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('debe generar requestId cuando el existente es undefined', () => {
      mockRequest.id = undefined as any;

      attachRequestId(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.id).toBe('mock-uuid-1234');
      expect(randomUUID).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('debe generar requestId cuando el existente es null', () => {
      mockRequest.id = null as any;

      attachRequestId(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.id).toBe('mock-uuid-1234');
      expect(randomUUID).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('debe conservar requestId existente como empty string', () => {
      mockRequest.id = '';

      attachRequestId(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.id).toBe(''); // Empty string es conservado por ??
      expect(randomUUID).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('debe manejar múltiples llamadas con diferentes UUIDs', () => {
      (randomUUID as jest.Mock)
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2');

      // Primera llamada
      const request1 = {} as Request;
      attachRequestId(request1, mockResponse as Response, nextFunction);

      // Segunda llamada
      const request2 = {} as Request;
      attachRequestId(request2, mockResponse as Response, nextFunction);

      expect(request1.id).toBe('uuid-1');
      expect(request2.id).toBe('uuid-2');
      expect(randomUUID).toHaveBeenCalledTimes(2);
      expect(nextFunction).toHaveBeenCalledTimes(2);
    });

    it('debe llamar next() exactamente una vez', () => {
      attachRequestId(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(nextFunction).toHaveBeenCalledWith();
    });
  });
});
