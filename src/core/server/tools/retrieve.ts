import { z } from 'zod';
import { downloadFile } from '../../mefs/client.js';
import { getAuthTokens } from '../../mefs/config.js';
import { MefsConfig } from '../../mefs/config.js';

type RetrieveInput = {
  cid: string;
  key?: string;
};

// Schema with CID
const retrieveInputSchema = z.object({
  cid: z
    .string()
    .min(1, 'CID cannot be empty')
    .describe('The Content ID (CID) of the file to retrieve from MEFS'),
  key: z
    .string()
    .optional()
    .describe('Decryption key for encrypted files (optional, defaults to f1d4a0b37124c3a7 if file is not public)'),
});

/**
 * 将文件内容转换为 base64 编码
 * @param data - 文件数据的字节数组
 * @returns base64 编码的字符串
 */
function bytesToBase64(data: Uint8Array): string {
  return Buffer.from(data).toString('base64');
}

export const retrieveTool = (mefsConfig: MefsConfig) => ({
  name: 'retrieve',
  description:
    'Retrieve a file from MEFS storage by its CID (Content ID). Returns the file content as a base64 encoded string.',
  inputSchema: retrieveInputSchema,
  handler: async (input: RetrieveInput) => {
    try {
      // 获取认证令牌
      const tokens = await getAuthTokens(mefsConfig);

      // 从 MEFS 下载文件
      const result = await downloadFile(
        {
          apiBaseUrl: mefsConfig.apiBaseUrl,
          accessToken: tokens.accessToken,
        },
        input.cid,
        input.key
      );

      // 转换为 base64 编码
      const base64Content = bytesToBase64(result.data);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              cid: input.cid,
              filename: result.filename,
              file: base64Content,
              size: result.data.length,
              contentType: result.contentType,
            }),
          },
        ],
      };
    } catch (error) {
      console.error('Failed to retrieve file:', error);
      return {
        content: [
          {
            error: true,
            type: 'text' as const,
            text: JSON.stringify({
              name: error instanceof Error ? error.name : 'Error',
              message: error instanceof Error ? error.message : 'Unknown error',
              cause: error instanceof Error && error.cause ? (error.cause as Error).message : null,
              apiBaseUrl: mefsConfig.apiBaseUrl,
            }),
          },
        ],
      };
    }
  },
});
