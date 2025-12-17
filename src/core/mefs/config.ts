import 'dotenv/config';
import { ethers } from 'ethers';
import { AuthConfig, authenticate, AuthTokens } from './auth.js';

export interface MefsConfig extends AuthConfig {
}

let cachedTokens: AuthTokens | null = null;

/**
 * Convert ECDSA hex private key to Ethereum address
 * @param privateKeyHex - Hex string of the private key (with or without 0x prefix)
 * @returns Ethereum address (0x-prefixed hex string)
 */
export function privateKeyToAddress(privateKeyHex: string): string {
    if (!privateKeyHex) {
        throw new Error('Private key cannot be empty');
    }

    // Remove 0x prefix if present
    const cleanKey = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;

    // Validate hex format
    if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
        throw new Error('Invalid hex format for private key');
    }

    try {
        // Create wallet from private key
        const wallet = new ethers.Wallet(`0x${cleanKey}`);
        return wallet.address;
    } catch (error) {
        throw new Error(`Failed to convert private key to address: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Load MEFS authentication configuration from environment variables
 */
export function loadMefsConfig(): MefsConfig {
    const apiBaseUrl = process.env.MEFS_API_BASE_URL || 'https://api.mefs.io:10000/produce';
    const origin = process.env.MEFS_ORIGIN || 'https://memo.io';
    const chainId = process.env.MEFS_CHAIN_ID ? parseInt(process.env.MEFS_CHAIN_ID, 10) : 985;
    const privateKey = process.env.MEFS_PRIVATE_KEY;

    if (!privateKey) {
        console.warn('Warning: MEFS_PRIVATE_KEY not provided. Authentication may fail.');
    }

    // Convert private key to address if private key is provided
    let address: string | undefined = undefined;
    if (privateKey) {
        try {
            address = privateKeyToAddress(privateKey);
        } catch (error) {
            console.warn(`Warning: Failed to convert private key to address: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    return {
        apiBaseUrl,
        origin,
        ...(address && { address }),
        chainId,
        privateKey,
    };
}

/**
 * Get authentication tokens (with caching)
 */
export async function getAuthTokens(config: MefsConfig): Promise<AuthTokens> {
    if (cachedTokens) {
        return cachedTokens;
    }

    const tokens = await authenticate(config);
    cachedTokens = tokens;
    return tokens;
}

/**
 * Clear cached tokens (useful for token refresh)
 */
export function clearAuthTokens(): void {
    cachedTokens = null;
}

