import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { privateKeyToAddress, loadMefsConfig } from '../../../../src/core/mefs/config.js';

describe('MEFS Config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.clearAllMocks();
    });

    describe('privateKeyToAddress', () => {
        // 使用一个已知的测试私钥和对应的地址
        // 注意：这是测试用的私钥，不要在生产环境使用
        const testPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
        const expectedAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // 这是对应 Hardhat 默认账户的地址

        it('should convert private key with 0x prefix to address', () => {
            const address = privateKeyToAddress(testPrivateKey);
            expect(address).toBe(expectedAddress);
            expect(address.startsWith('0x')).toBe(true);
            expect(address.length).toBe(42); // 0x + 40 hex characters
        });

        it('should convert private key without 0x prefix to address', () => {
            const privateKeyWithoutPrefix = testPrivateKey.slice(2);
            const address = privateKeyToAddress(privateKeyWithoutPrefix);
            expect(address).toBe(expectedAddress);
        });

        it('should throw error for empty private key', () => {
            expect(() => privateKeyToAddress('')).toThrow('Private key cannot be empty');
        });

        it('should throw error for invalid hex format', () => {
            expect(() => privateKeyToAddress('invalid-hex')).toThrow('Invalid hex format');
            expect(() => privateKeyToAddress('0xinvalid')).toThrow('Invalid hex format');
        });

        it('should throw error for invalid private key length', () => {
            expect(() => privateKeyToAddress('0x1234')).toThrow();
        });
    });

    describe('loadMefsAuthConfig', () => {
        it('should load configuration from environment variables', () => {
            process.env.MEFS_API_BASE_URL = 'https://api.test.com';
            process.env.MEFS_ORIGIN = 'https://test.com';
            process.env.MEFS_CHAIN_ID = '985';
            process.env.MEFS_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

            const config = loadMefsConfig();
            expect(config.apiBaseUrl).toBe('https://api.test.com');
            expect(config.origin).toBe('https://test.com');
            expect(config.chainId).toBe(985);
            expect(config.privateKey).toBe('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
            expect(config.address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
        });

        it('should use default values when environment variables are not set', () => {
            const config = loadMefsConfig();
            expect(config.apiBaseUrl).toBe('https://api.mefs.io:10000/produce');
            expect(config.origin).toBe('https://memo.io');
            expect(config.chainId).toBe(985);
            expect(config.privateKey).toBeUndefined();
            expect(config.address).toBeUndefined();
        });

        it('should convert private key to address automatically', () => {
            process.env.MEFS_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

            const config = loadMefsConfig();
            expect(config.address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
        });

        it('should handle private key without 0x prefix', () => {
            process.env.MEFS_PRIVATE_KEY = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

            const config = loadMefsConfig();
            expect(config.address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
        });

        it('should handle invalid private key gracefully', () => {
            process.env.MEFS_PRIVATE_KEY = 'invalid-key';
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            const config = loadMefsConfig();
            expect(config.privateKey).toBe('invalid-key');
            expect(config.address).toBeUndefined();
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should parse chain ID correctly', () => {
            process.env.MEFS_CHAIN_ID = '1';
            const config = loadMefsConfig();
            expect(config.chainId).toBe(1);

            process.env.MEFS_CHAIN_ID = '137';
            const config2 = loadMefsConfig();
            expect(config2.chainId).toBe(137);
        });
    });
});

