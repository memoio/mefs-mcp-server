import { base64 } from 'multiformats/bases/base64';

/**
 * Converts a base64 encoded string to bytes
 * @param base64Str - The base64 encoded string to convert
 * @returns A Uint8Array containing the decoded bytes
 */
export function base64ToBytes(base64Str: string): Uint8Array {
    // Remove any potential data URL prefix
    const cleanStr = base64Str.replace(/^data:.*?;base64,/, '');

    try {
        // First try with multiformats base64 decoder
        // Add 'm' prefix required by multiformats base64 decoder if not present
        const prefixedStr = cleanStr.startsWith('m') ? cleanStr : `m${cleanStr}`;
        return base64.decode(prefixedStr);
    } catch (error) {
        // Fallback to standard base64 decoding
        // Standard base64 decoding using Buffer in Node.js
        const buffer = Buffer.from(cleanStr, 'base64');
        if (buffer.toString('base64') === cleanStr) {
            return new Uint8Array(buffer);
        }
        throw new Error('Invalid base64 format');
    }
}