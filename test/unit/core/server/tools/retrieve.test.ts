import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retrieveTool } from '../../../../../src/core/server/tools/retrieve.js';
import { downloadFile } from '../../../../../src/core/mefs/client.js';
import { getAuthTokens, MefsConfig } from '../../../../../src/core/mefs/config.js';

// Mock MEFS client and config
vi.mock('../../../../../src/core/mefs/client.js', () => ({
  downloadFile: vi.fn(),
}));

vi.mock('../../../../../src/core/mefs/config.js', () => ({
  getAuthTokens: vi.fn(),
  MefsConfig: {},
}));

describe('Retrieve Tool', () => {
  const mockDownloadFile = vi.mocked(downloadFile);
  const mockGetAuthTokens = vi.mocked(getAuthTokens);

  const mockMefsConfig: MefsConfig = {
    apiBaseUrl: 'https://api.mefs.io:10000/produce',
    origin: 'https://memo.io',
    chainId: 985,
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should retrieve file successfully by CID', async () => {
    const testCID = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
    const testFileContent = new Uint8Array([116, 101, 115, 116]); // "test" in bytes
    const testBase64 = Buffer.from(testFileContent).toString('base64');

    // Mock authentication tokens
    mockGetAuthTokens.mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    // Mock download file
    mockDownloadFile.mockResolvedValue({
      data: testFileContent,
      filename: 'test-file.txt',
      contentType: 'text/plain',
    });

    const tool = retrieveTool(mockMefsConfig);
    const result = await tool.handler({ cid: testCID });

    expect(result.content[0]).toHaveProperty('text');
    const resultData = JSON.parse(result.content[0].text);
    expect(resultData.cid).toBe(testCID);
    expect(resultData.file).toBe(testBase64);
    expect(resultData.filename).toBe('test-file.txt');
    expect(resultData.size).toBe(testFileContent.length);
    expect(resultData.contentType).toBe('text/plain');

    expect(mockGetAuthTokens).toHaveBeenCalledWith(mockMefsConfig);
    expect(mockDownloadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        apiBaseUrl: mockMefsConfig.apiBaseUrl,
        accessToken: 'mock-access-token',
      }),
      testCID,
      undefined
    );
  });

  it('should retrieve encrypted file with key', async () => {
    const testCID = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
    const testKey = 'my-secret-key';
    const testFileContent = new Uint8Array([116, 101, 115, 116]);

    mockGetAuthTokens.mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    mockDownloadFile.mockResolvedValue({
      data: testFileContent,
      filename: 'encrypted-file.txt',
      contentType: 'application/octet-stream',
    });

    const tool = retrieveTool(mockMefsConfig);
    const result = await tool.handler({ cid: testCID, key: testKey });

    expect(result.content[0]).toHaveProperty('text');
    const resultData = JSON.parse(result.content[0].text);
    expect(resultData.cid).toBe(testCID);
    expect(resultData.filename).toBe('encrypted-file.txt');

    expect(mockDownloadFile).toHaveBeenCalledWith(
      expect.any(Object),
      testCID,
      testKey
    );
  });

  it('should handle download errors gracefully', async () => {
    const testCID = 'invalid-cid';

    mockGetAuthTokens.mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    mockDownloadFile.mockRejectedValue(new Error('File not found'));

    const tool = retrieveTool(mockMefsConfig);
    const result = await tool.handler({ cid: testCID });

    expect(result.content[0]).toHaveProperty('error', true);
    const errorData = JSON.parse(result.content[0].text);
    expect(errorData.name).toBe('Error');
    expect(errorData.message).toBe('File not found');
  });

  it('should handle authentication errors', async () => {
    const testCID = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';

    mockGetAuthTokens.mockRejectedValue(new Error('Authentication failed'));

    const tool = retrieveTool(mockMefsConfig);
    const result = await tool.handler({ cid: testCID });

    expect(result.content[0]).toHaveProperty('error', true);
    const errorData = JSON.parse(result.content[0].text);
    expect(errorData.name).toBe('Error');
    expect(errorData.message).toBe('Authentication failed');
  });

  it('should validate CID format', () => {
    const tool = retrieveTool(mockMefsConfig);
    const schema = tool.inputSchema;

    // Valid CID should pass
    const validResult = schema.safeParse({ cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco' });
    expect(validResult.success).toBe(true);

    // Empty CID should fail
    const emptyResult = schema.safeParse({ cid: '' });
    expect(emptyResult.success).toBe(false);

    // Missing CID should fail
    const missingResult = schema.safeParse({});
    expect(missingResult.success).toBe(false);
  });

  it('should accept optional key parameter', () => {
    const tool = retrieveTool(mockMefsConfig);
    const schema = tool.inputSchema;

    // CID with key should pass
    const withKeyResult = schema.safeParse({
      cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
      key: 'my-key',
    });
    expect(withKeyResult.success).toBe(true);

    // CID without key should pass
    const withoutKeyResult = schema.safeParse({
      cid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
    });
    expect(withoutKeyResult.success).toBe(true);
  });

  it('should use custom API base URL from config', async () => {
    const testCID = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
    const customConfig: MefsConfig = {
      ...mockMefsConfig,
      apiBaseUrl: 'https://custom-api.example.com',
    };

    mockGetAuthTokens.mockResolvedValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    mockDownloadFile.mockResolvedValue({
      data: new Uint8Array([116, 101, 115, 116]),
      filename: 'test.txt',
    });

    const tool = retrieveTool(customConfig);
    await tool.handler({ cid: testCID });

    expect(mockGetAuthTokens).toHaveBeenCalledWith(customConfig);
    expect(mockDownloadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        apiBaseUrl: 'https://custom-api.example.com',
      }),
      testCID,
      undefined
    );
  });
});
