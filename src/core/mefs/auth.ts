/**
 * MEFS Authentication Module
 * Handles login flow using /challenge and /login endpoints
 */

import { ethers } from 'ethers';

export interface AuthConfig {
    apiBaseUrl: string;
    origin: string;
    address?: string;
    chainId?: number;
    privateKey?: string; // For signing messages
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    newAccount: boolean;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

/**
 * Get challenge message from /challenge endpoint
 */
export async function getChallenge(config: AuthConfig): Promise<string> {
    const url = new URL(config.apiBaseUrl + '/challenge');
    if (config.address) {
        url.searchParams.set('address', config.address);
    }
    if (config.chainId) {
        url.searchParams.set('chainid', config.chainId.toString());
    }

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            Origin: config.origin,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get challenge: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.text();
}

/**
 * Login using signed message
 */
export async function login(
    config: AuthConfig,
    message: string,
    signature: string
): Promise<LoginResponse> {
    const url = new URL(config.apiBaseUrl + '/login');

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message,
            signature,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to login: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json() as LoginResponse;
}

/**
 * Sign a message using ECDSA private key (EIP-191 standard)
 * @param privateKey - Hex string of the private key (with or without 0x prefix)
 * @param message - Message to sign (SIWE format)
 * @returns Signature in hex format (0x-prefixed)
 */
export async function signMessage(privateKey: string | undefined, message: string): Promise<string> {
    if (!privateKey) {
        throw new Error('Private key is required for signing messages');
    }

    if (!message) {
        throw new Error('Message cannot be empty');
    }

    try {
        // Remove 0x prefix if present for consistency
        const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

        // Validate hex format
        if (!/^[0-9a-fA-F]+$/.test(cleanKey)) {
            throw new Error('Invalid hex format for private key');
        }

        // Create wallet from private key
        const wallet = new ethers.Wallet(`0x${cleanKey}`);

        // Sign message using EIP-191 standard
        // ethers.signMessage() automatically adds the EIP-191 prefix: "\x19Ethereum Signed Message:\n{length}{message}"
        const signature = await wallet.signMessage(message);

        return signature;
    } catch (error) {
        throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Authenticate and get tokens
 * If message and signature are provided, use them directly
 * Otherwise, get challenge and sign it with private key
 */
export async function authenticate(config: AuthConfig): Promise<AuthTokens> {
    if (!config.privateKey) {
        throw new Error('Private key is required for authentication');
    }

    // Get challenge
    const message = await getChallenge(config);

    // Sign message
    const signature = await signMessage(config.privateKey, message);

    const loginResponse = await login(config, message, signature);
    return {
        accessToken: loginResponse.accessToken,
        refreshToken: loginResponse.refreshToken,
    };
}

