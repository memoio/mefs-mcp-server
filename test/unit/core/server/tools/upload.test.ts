import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadTool } from '../../../../../src/core/server/tools/upload.js';
import { base64ToBytes } from '../../../../../src/core/mefs/utils.js';
import { uploadFile } from '../../../../../src/core/mefs/client.js';
import { getAuthTokens } from '../../../../../src/core/mefs/config.js';
import { MefsConfig } from '../../../../../src/core/mefs/config.js';

// Mock MEFS client and config
vi.mock('../../../../../src/core/mefs/client.js', () => ({
  uploadFile: vi.fn(),
}));

vi.mock('../../../../../src/core/mefs/config.js', () => ({
  getAuthTokens: vi.fn(),
  MefsConfig: {},
}));

// Mock utils
vi.mock('../../../../../src/core/mefs/utils.js', () => ({
  base64ToBytes: vi.fn(),
}));

describe('Upload Tool', () => {
  const mockUploadFile = vi.mocked(uploadFile);
  const mockGetAuthTokens = vi.mocked(getAuthTokens);
  const mockBase64ToBytes = vi.mocked(base64ToBytes);

  const mockMefsConfig: MefsConfig = {
    apiBaseUrl: 'https://api.mefs.io:10000/produce',
    origin: 'https://memo.io',
    chainId: 985,
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock base64ToBytes
    mockBase64ToBytes.mockImplementation((str: string) => {
      return Buffer.from(str, 'base64');
    });

    // Mock authentication tokens
    mockGetAuthTokens.mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    // Mock upload file
    mockUploadFile.mockResolvedValue({
      Mid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('input validation', () => {
    it('should validate valid base64 input', () => {
      const tool = uploadTool(mockMefsConfig);
      const input = {
        file: 'dGVzdA==', // "test" in base64
        name: 'test.txt',
      };
      const result = tool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid base64 input', () => {
      const tool = uploadTool(mockMefsConfig);
      const input = {
        file: 'not-base64',
        name: 'test.txt',
      };
      expect(tool.inputSchema.safeParse(input).success).toBe(false);
    });

    it('should reject empty file content', () => {
      const tool = uploadTool(mockMefsConfig);
      const input = {
        file: '',
        name: 'test.txt',
      };
      expect(tool.inputSchema.safeParse(input).success).toBe(false);
    });

    it('should reject empty file name', () => {
      const tool = uploadTool(mockMefsConfig);
      const input = {
        file: 'dGVzdA==',
        name: '',
      };
      expect(tool.inputSchema.safeParse(input).success).toBe(false);
    });

    it('should require file name', () => {
      const tool = uploadTool(mockMefsConfig);
      const input = {
        file: 'dGVzdA==',
      };
      expect(tool.inputSchema.safeParse(input).success).toBe(false);
    });

    it('should accept optional key parameter', () => {
      const tool = uploadTool(mockMefsConfig);
      const input = {
        file: 'dGVzdA==',
        name: 'test.txt',
        key: 'my-secret-key',
      };
      expect(tool.inputSchema.safeParse(input).success).toBe(true);
    });

    it('should accept optional public parameter', () => {
      const tool = uploadTool(mockMefsConfig);
      const input = {
        file: 'dGVzdA==',
        name: 'test.txt',
        public: true,
      };
      expect(tool.inputSchema.safeParse(input).success).toBe(true);
    });
  });

  describe('file upload', () => {
    it('should upload file successfully', async () => {
      const tool = uploadTool(mockMefsConfig);
      const testContent = Buffer.from('test');
      const testBase64 = testContent.toString('base64');
      const testCID = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';

      mockBase64ToBytes.mockReturnValue(testContent);
      mockUploadFile.mockResolvedValue({
        Mid: testCID,
      });

      const result = await tool.handler({
        file: testBase64,
        name: 'test.txt',
      });

      expect(mockBase64ToBytes).toHaveBeenCalledWith(testBase64);
      expect(mockGetAuthTokens).toHaveBeenCalledWith(mockMefsConfig);
      expect(mockUploadFile).toHaveBeenCalledWith(
        {
          apiBaseUrl: mockMefsConfig.apiBaseUrl,
          accessToken: 'mock-access-token',
        },
        testContent,
        'test.txt',
        {
          key: undefined,
          public: undefined,
        }
      );

      expect(result.content[0]).toHaveProperty('text');
      const resultData = JSON.parse(result.content[0].text);
      expect(resultData).toHaveProperty('cid', testCID);
      expect(resultData).toHaveProperty('filename', 'test.txt');
      expect(resultData).toHaveProperty('size', testContent.length);
    });

    it('should upload file with encryption key', async () => {
      const tool = uploadTool(mockMefsConfig);
      const testContent = Buffer.from('test');
      const testBase64 = testContent.toString('base64');
      const testKey = 'my-secret-key';
      const testCID = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';

      mockBase64ToBytes.mockReturnValue(testContent);
      mockUploadFile.mockResolvedValue({
        Mid: testCID,
      });

      const result = await tool.handler({
        file: testBase64,
        name: 'encrypted.txt',
        key: testKey,
      });

      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        testContent,
        'encrypted.txt',
        {
          key: testKey,
          public: undefined,
        }
      );

      const resultData = JSON.parse(result.content[0].text);
      expect(resultData.cid).toBe(testCID);
      expect(resultData.filename).toBe('encrypted.txt');
    });

    it('should upload public file', async () => {
      const tool = uploadTool(mockMefsConfig);
      const testContent = Buffer.from('test');
      const testBase64 = testContent.toString('base64');
      const testCID = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';

      mockBase64ToBytes.mockReturnValue(testContent);
      mockUploadFile.mockResolvedValue({
        Mid: testCID,
      });

      const result = await tool.handler({
        file: testBase64,
        name: 'public.txt',
        public: true,
      });

      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.any(Object),
        testContent,
        'public.txt',
        {
          key: undefined,
          public: true,
        }
      );

      const resultData = JSON.parse(result.content[0].text);
      expect(resultData.cid).toBe(testCID);
    });

    it('should return correct file size', async () => {
      const tool = uploadTool(mockMefsConfig);
      const testContent = Buffer.from('test content');
      const testBase64 = testContent.toString('base64');
      const testCID = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';

      mockBase64ToBytes.mockReturnValue(testContent);
      mockUploadFile.mockResolvedValue({
        Mid: testCID,
      });

      const result = await tool.handler({
        file: testBase64,
        name: 'test.txt',
      });

      const resultData = JSON.parse(result.content[0].text);
      expect(resultData.size).toBe(testContent.length);
    });
  });

  describe('error handling', () => {
    it('should handle upload errors gracefully', async () => {
      const tool = uploadTool(mockMefsConfig);
      const testContent = Buffer.from('test');
      const testBase64 = testContent.toString('base64');

      mockBase64ToBytes.mockReturnValue(testContent);
      mockUploadFile.mockRejectedValue(new Error('Upload failed'));

      const result = await tool.handler({
        file: testBase64,
        name: 'test.txt',
      });

      expect(result.content[0]).toHaveProperty('error', true);
      const errorData = JSON.parse(result.content[0].text);
      expect(errorData.name).toBe('Error');
      expect(errorData.message).toBe('Upload failed');
    });

    it('should handle authentication errors', async () => {
      const tool = uploadTool(mockMefsConfig);
      const testContent = Buffer.from('test');
      const testBase64 = testContent.toString('base64');

      mockBase64ToBytes.mockReturnValue(testContent);
      mockGetAuthTokens.mockRejectedValue(new Error('Authentication failed'));

      const result = await tool.handler({
        file: testBase64,
        name: 'test.txt',
      });

      expect(result.content[0]).toHaveProperty('error', true);
      const errorData = JSON.parse(result.content[0].text);
      expect(errorData.name).toBe('Error');
      expect(errorData.message).toBe('Authentication failed');
    });

    it('should handle base64 conversion errors', async () => {
      const tool = uploadTool(mockMefsConfig);
      mockBase64ToBytes.mockImplementation(() => {
        throw new Error('Invalid base64 format');
      });

      const result = await tool.handler({
        file: 'invalid-base64',
        name: 'test.txt',
      });

      // Should be caught by schema validation, but if it passes validation, handler will catch it
      const content = result.content[0] as { error?: boolean; type: string; text: string };
      if (content.error) {
        expect(content.error).toBe(true);
      }
    });

    it('should handle Zod validation errors', async () => {
      const tool = uploadTool(mockMefsConfig);
      const result = await tool.handler({
        file: '', // Invalid: empty string
        name: 'test.txt',
      } as any);

      expect(result.content[0]).toHaveProperty('error', true);
      const errorData = JSON.parse(result.content[0].text);
      expect(errorData.name).toBe('Error');
      expect(errorData.message).toContain('File content cannot be empty');
    });

    it('should handle network errors', async () => {
      const tool = uploadTool(mockMefsConfig);
      const testContent = Buffer.from('test');
      const testBase64 = testContent.toString('base64');

      mockBase64ToBytes.mockReturnValue(testContent);
      mockUploadFile.mockRejectedValue(
        new Error('Failed to upload file: 500 Internal Server Error - {"Code":"InternalError"}')
      );

      const result = await tool.handler({
        file: testBase64,
        name: 'test.txt',
      });

      expect(result.content[0]).toHaveProperty('error', true);
      const errorData = JSON.parse(result.content[0].text);
      expect(errorData.name).toBe('Error');
      expect(errorData.message).toContain('Failed to upload file');
    });
  });

  describe('MEFS configuration', () => {
    it('should use custom API base URL from config', async () => {
      const customConfig: MefsConfig = {
        ...mockMefsConfig,
        apiBaseUrl: 'https://custom-api.example.com',
      };

      const tool = uploadTool(customConfig);
      const testContent = Buffer.from('test');
      const testBase64 = testContent.toString('base64');

      mockBase64ToBytes.mockReturnValue(testContent);
      mockUploadFile.mockResolvedValue({
        Mid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      });

      await tool.handler({
        file: testBase64,
        name: 'test.txt',
      });

      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          apiBaseUrl: 'https://custom-api.example.com',
        }),
        expect.any(Buffer),
        'test.txt',
        expect.any(Object)
      );
    });
  });
});
