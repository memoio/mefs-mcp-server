import { describe, it, expect, vi } from 'vitest';
import { registerTools } from '../../../../../src/core/server/tools/index.js';
import { MefsConfig } from '../../../../../src/core/mefs/config.js';

describe('Tool Registration', () => {
  const mockMefsConfig: MefsConfig = {
    apiBaseUrl: 'https://api.mefs.io:10000/produce',
    origin: 'https://memo.io',
    chainId: 985,
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  };

  it('should register all tools with the server', () => {
    // Mock the server
    const server = {
      tool: vi.fn(),
    };

    // Register the tools
    registerTools(mockMefsConfig, server as any);

    // Verify that the server.tool method was called two times (once for each tool)
    expect(server.tool).toHaveBeenCalledTimes(2);

    // Verify calls for each tool
    expect(server.tool).toHaveBeenCalledWith(
      'retrieve',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );

    expect(server.tool).toHaveBeenCalledWith(
      'upload',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
  });
});
