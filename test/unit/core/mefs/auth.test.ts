import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signMessage, getChallenge, login, authenticate } from '../../../../src/core/mefs/auth.js';
import type { AuthConfig } from '../../../../src/core/mefs/auth.js';

// Mock ethers
vi.mock('ethers', () => {
    const mockSignMessage = vi.fn().mockResolvedValue('0x' + 'a'.repeat(130));
    return {
        ethers: {
            Wallet: vi.fn().mockImplementation(() => {
                return {
                    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                    signMessage: mockSignMessage,
                };
            }),
        },
    };
});

// Mock fetch
global.fetch = vi.fn();

describe('MEFS Auth', () => {
    const originalEnv = process.env;
    const mockFetch = vi.mocked(fetch);

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
        vi.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    describe('signMessage', () => {
        const testPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
        const testMessage = 'Test message to sign';

        it('should sign message successfully', async () => {
            const signature = await signMessage(testPrivateKey, testMessage);
            expect(signature).toBeDefined();
            expect(signature.startsWith('0x')).toBe(true);
            expect(signature.length).toBeGreaterThan(0);
        });

        it('should handle private key without 0x prefix', async () => {
            const privateKeyWithoutPrefix = testPrivateKey.slice(2);
            const signature = await signMessage(privateKeyWithoutPrefix, testMessage);
            expect(signature).toBeDefined();
            expect(signature.startsWith('0x')).toBe(true);
        });

        it('should throw error for empty private key', async () => {
            await expect(signMessage(undefined, testMessage)).rejects.toThrow(
                'Private key is required for signing messages'
            );
            await expect(signMessage('', testMessage)).rejects.toThrow(
                'Private key is required for signing messages'
            );
        });

        it('should throw error for empty message', async () => {
            await expect(signMessage(testPrivateKey, '')).rejects.toThrow('Message cannot be empty');
        });

        it('should throw error for invalid hex format', async () => {
            await expect(signMessage('invalid-hex', testMessage)).rejects.toThrow('Invalid hex format');
        });

        it('should sign SIWE message format', async () => {
            const siweMessage = `memo.io wants you to sign in with your Ethereum account:
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

The message is only used for login

URI: https://memo.io
Version: 1
Chain ID: 985
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00Z`;

            const signature = await signMessage(testPrivateKey, siweMessage);
            expect(signature).toBeDefined();
            expect(signature.startsWith('0x')).toBe(true);
        });
    });

    describe('getChallenge', () => {
        it('should fetch challenge message successfully', async () => {
            const mockChallenge = `memo.io wants you to sign in with your Ethereum account:
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

The message is only used for login

URI: https://memo.io
Version: 1
Chain ID: 985
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00Z`;

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => mockChallenge,
            } as any);

            const config: AuthConfig = {
                apiBaseUrl: 'https://api.mefs.io:10000/produce',
                origin: 'https://memo.io',
                address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                chainId: 985,
            };

            const challenge = await getChallenge(config);
            expect(challenge).toBe(mockChallenge);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/challenge'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        Origin: 'https://memo.io',
                    }),
                })
            );
        });

        it('should include address and chainId in query params', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: async () => 'challenge message',
            } as any);

            const config: AuthConfig = {
                apiBaseUrl: 'https://api.mefs.io:10000/produce',
                origin: 'https://memo.io',
                address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                chainId: 985,
            };

            await getChallenge(config);
            const callUrl = (mockFetch.mock.calls[0][0] as string);
            expect(callUrl).toContain('address=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
            expect(callUrl).toContain('chainid=985');
        });

        it('should throw error on failed request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: async () => 'Error message',
            } as any);

            const config: AuthConfig = {
                apiBaseUrl: 'https://api.mefs.io:10000/produce',
                origin: 'https://memo.io',
            };

            await expect(getChallenge(config)).rejects.toThrow('Failed to get challenge');
        });
    });

    describe('login', () => {
        it('should login successfully with message and signature', async () => {
            const mockResponse = {
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                newAccount: true,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            } as any);

            const config: AuthConfig = {
                apiBaseUrl: 'https://api.mefs.io:10000/produce',
                origin: 'https://memo.io',
            };

            const result = await login(config, 'test message', '0x' + 'a'.repeat(130));
            expect(result).toEqual({
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                newAccount: true,
            });

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/login'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({
                        message: 'test message',
                        signature: '0x' + 'a'.repeat(130),
                    }),
                })
            );
        });

        it('should throw error on failed login', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: async () => 'Invalid signature',
            } as any);

            const config: AuthConfig = {
                apiBaseUrl: 'https://api.mefs.io:10000/produce',
                origin: 'https://memo.io',
            };

            await expect(login(config, 'test message', '0x' + 'a'.repeat(130))).rejects.toThrow(
                'Failed to login'
            );
        });
    });

    describe('authenticate', () => {
        it('should authenticate successfully with private key', async () => {
            const mockChallenge = `memo.io wants you to sign in with your Ethereum account:
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

The message is only used for login

URI: https://memo.io
Version: 1
Chain ID: 985
Nonce: abc123def456
Issued At: 2024-01-01T00:00:00Z`;

            const mockLoginResponse = {
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
                newAccount: true,
            };

            // Mock getChallenge
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    text: async () => mockChallenge,
                } as any)
                // Mock login
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockLoginResponse,
                } as any);

            const config: AuthConfig = {
                apiBaseUrl: 'https://api.mefs.io:10000/produce',
                origin: 'https://memo.io',
                address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
                chainId: 985,
                privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
            };

            const result = await authenticate(config);
            expect(result).toEqual({
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
            });
        });

        it('should throw error when private key is not provided', async () => {
            const config: AuthConfig = {
                apiBaseUrl: 'https://api.mefs.io:10000/produce',
                origin: 'https://memo.io',
            };

            await expect(authenticate(config)).rejects.toThrow('Private key is required for authentication');
        });
    });
});

