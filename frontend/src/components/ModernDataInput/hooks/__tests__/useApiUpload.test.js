import { renderHook, act } from '@testing-library/react';
import { useApiUpload } from '../useApiUpload';

// Mock fetch globally
global.fetch = jest.fn();

describe('useApiUpload', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('initializes with correct default state', () => {
    const { result } = renderHook(() => useApiUpload());
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.sessionId).toBeNull();
    expect(result.current.apiBaseUrl).toBe('http://localhost:5000');
    expect(result.current.uploadEndpoint).toBe('/api/upload');
  });

  describe('uploadJsonData', () => {
    test('successfully uploads valid JSON data', async () => {
      const mockResponse = {
        session_id: 'test-session-123',
        message: 'Data processed successfully'
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useApiUpload());
      
      const testData = [
        { month: '2023-01', demand: 100 },
        { month: '2023-02', demand: 120 }
      ];

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadJsonData(testData);
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      expect(uploadResult).toEqual({
        success: true,
        sessionId: 'test-session-123',
        message: 'Data processed successfully',
        data: mockResponse
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.sessionId).toBe('test-session-123');
    });

    test('handles validation errors for invalid data', async () => {
      const { result } = renderHook(() => useApiUpload());

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadJsonData('invalid');
      });

      expect(uploadResult).toEqual({
        success: false,
        error: 'Los datos deben ser un array válido',
        sessionId: null
      });

      expect(result.current.error).toBe('Los datos deben ser un array válido');
      expect(result.current.loading).toBe(false);
    });

    test('handles empty data array', async () => {
      const { result } = renderHook(() => useApiUpload());

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadJsonData([]);
      });

      expect(uploadResult).toEqual({
        success: false,
        error: 'No se pueden enviar datos vacíos',
        sessionId: null
      });
    });

    test('handles server errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid data format' })
      });

      const { result } = renderHook(() => useApiUpload());
      
      const testData = [{ month: '2023-01', demand: 100 }];

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadJsonData(testData);
      });

      expect(uploadResult).toEqual({
        success: false,
        error: 'Invalid data format',
        sessionId: null
      });

      expect(result.current.error).toBe('Invalid data format');
    });

    test('handles network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useApiUpload());
      
      const testData = [{ month: '2023-01', demand: 100 }];

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadJsonData(testData);
      });

      expect(uploadResult).toEqual({
        success: false,
        error: 'Network error',
        sessionId: null
      });
    });

    test('handles missing session_id in response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Success but no session_id' })
      });

      const { result } = renderHook(() => useApiUpload());
      
      const testData = [{ month: '2023-01', demand: 100 }];

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadJsonData(testData);
      });

      expect(uploadResult).toEqual({
        success: false,
        error: 'Respuesta del servidor inválida: falta session_id',
        sessionId: null
      });
    });

    test('sets loading state during upload', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      fetch.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useApiUpload());
      
      const testData = [{ month: '2023-01', demand: 100 }];

      act(() => {
        result.current.uploadJsonData(testData);
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise({
          ok: true,
          json: async () => ({ session_id: 'test-123' })
        });
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('uploadFile', () => {
    test('successfully uploads valid file', async () => {
      const mockResponse = {
        session_id: 'file-session-123',
        message: 'File processed successfully'
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useApiUpload());
      
      const testFile = new File(['month,demand\n2023-01,100'], 'test.csv', { type: 'text/csv' });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadFile(testFile);
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:5000/api/upload', {
        method: 'POST',
        body: expect.any(FormData),
      });

      expect(uploadResult).toEqual({
        success: true,
        sessionId: 'file-session-123',
        message: 'File processed successfully',
        data: mockResponse
      });
    });

    test('validates file type', async () => {
      const { result } = renderHook(() => useApiUpload());
      
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadFile(invalidFile);
      });

      expect(uploadResult).toEqual({
        success: false,
        error: 'Tipo de archivo no válido. Se permiten: .csv, .xls, .xlsx',
        sessionId: null
      });
    });

    test('validates file size', async () => {
      const { result } = renderHook(() => useApiUpload());
      
      // Create a mock file that's too large (>10MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.csv', { type: 'text/csv' });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadFile(largeFile);
      });

      expect(uploadResult).toEqual({
        success: false,
        error: 'El archivo es demasiado grande. Tamaño máximo: 10MB',
        sessionId: null
      });
    });

    test('handles missing file', async () => {
      const { result } = renderHook(() => useApiUpload());

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadFile(null);
      });

      expect(uploadResult).toEqual({
        success: false,
        error: 'No se ha seleccionado ningún archivo',
        sessionId: null
      });
    });

    test('accepts files by extension when MIME type is missing', async () => {
      const mockResponse = {
        session_id: 'file-session-123',
        message: 'File processed successfully'
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useApiUpload());
      
      // File with correct extension but no MIME type
      const testFile = new File(['month,demand\n2023-01,100'], 'test.csv', { type: '' });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.uploadFile(testFile);
      });

      expect(uploadResult.success).toBe(true);
    });
  });

  describe('upload (generic method)', () => {
    test('routes File objects to uploadFile', async () => {
      const mockResponse = { session_id: 'test-123' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useApiUpload());
      
      const testFile = new File(['content'], 'test.csv', { type: 'text/csv' });

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.upload(testFile);
      });

      expect(uploadResult.success).toBe(true);
    });

    test('routes arrays to uploadJsonData', async () => {
      const mockResponse = { session_id: 'test-123' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useApiUpload());
      
      const testData = [{ month: '2023-01', demand: 100 }];

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.upload(testData);
      });

      expect(uploadResult.success).toBe(true);
    });

    test('handles invalid data types', async () => {
      const { result } = renderHook(() => useApiUpload());

      let uploadResult;
      await act(async () => {
        uploadResult = await result.current.upload('invalid');
      });

      expect(uploadResult).toEqual({
        success: false,
        error: 'Tipo de datos no válido para upload',
        sessionId: null
      });
    });
  });

  describe('utility methods', () => {
    test('clearError clears error state', () => {
      const { result } = renderHook(() => useApiUpload());
      
      // Set an error first
      act(() => {
        result.current.uploadJsonData('invalid');
      });
      
      expect(result.current.error).toBeTruthy();
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });

    test('clearSession clears session ID', async () => {
      const mockResponse = { session_id: 'test-123' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useApiUpload());
      
      // Set a session ID first
      await act(async () => {
        await result.current.uploadJsonData([{ month: '2023-01', demand: 100 }]);
      });
      
      expect(result.current.sessionId).toBe('test-123');
      
      act(() => {
        result.current.clearSession();
      });
      
      expect(result.current.sessionId).toBeNull();
    });

    test('reset clears all state', async () => {
      const mockResponse = { session_id: 'test-123' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useApiUpload());
      
      // Set some state first
      await act(async () => {
        await result.current.uploadJsonData([{ month: '2023-01', demand: 100 }]);
      });
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.sessionId).toBeNull();
    });
  });

  describe('checkApiHealth', () => {
    test('returns true when API is healthy', async () => {
      fetch.mockResolvedValueOnce({
        ok: true
      });

      const { result } = renderHook(() => useApiUpload());

      let healthResult;
      await act(async () => {
        healthResult = await result.current.checkApiHealth();
      });

      expect(healthResult).toBe(true);
      expect(fetch).toHaveBeenCalledWith('http://localhost:5000/health', {
        method: 'GET',
        timeout: 5000
      });
    });

    test('returns false when API is unhealthy', async () => {
      fetch.mockResolvedValueOnce({
        ok: false
      });

      const { result } = renderHook(() => useApiUpload());

      let healthResult;
      await act(async () => {
        healthResult = await result.current.checkApiHealth();
      });

      expect(healthResult).toBe(false);
    });

    test('returns false on network error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      console.warn = jest.fn(); // Mock console.warn to avoid noise

      const { result } = renderHook(() => useApiUpload());

      let healthResult;
      await act(async () => {
        healthResult = await result.current.checkApiHealth();
      });

      expect(healthResult).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('API health check failed:', expect.any(Error));
    });
  });
});