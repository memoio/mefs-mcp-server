import { z } from 'zod';
import { base64ToBytes } from '../../mefs/utils.js';
import { uploadFile } from '../../mefs/client.js';
import { getAuthTokens, MefsConfig } from '../../mefs/config.js';

const uploadInputSchema = z.object({
  file: z
    .string()
    .min(1, 'File content cannot be empty')
    .refine(
      str => {
        try {
          base64ToBytes(str);
          return true;
        } catch (error) {
          return false;
        }
      },
      {
        message: 'Invalid base64 format',
      }
    )
    .describe('The content of the file encoded as a base64 string'),
  name: z
    .string()
    .min(1, 'File name cannot be empty')
    .describe('Name for the uploaded file (must include file extension for MIME type detection)'),
  key: z
    .string()
    .optional()
    .describe('Encryption key for the file (optional, defaults to f1d4a0b37124c3a7 if not public)'),
  public: z
    .boolean()
    .optional()
    .describe('Whether the file should be public (default: false)'),
});

export const uploadTool = (mefsConfig: MefsConfig) => ({
  name: 'upload',
  description:
    'Upload a file to MEFS storage. The file must be provided as a base64 encoded string. Returns the CID (Mid) of the uploaded file.',
  inputSchema: uploadInputSchema,
  handler: async (input: z.infer<typeof uploadInputSchema>) => {
    try {
      // 将 base64 字符串转换为字节数组
      const fileBytes = base64ToBytes(input.file);

      // 获取认证令牌
      const tokens = await getAuthTokens(mefsConfig);

      // 上传文件到 MEFS
      const result = await uploadFile(
        {
          apiBaseUrl: mefsConfig.apiBaseUrl,
          accessToken: tokens.accessToken,
        },
        fileBytes,
        input.name,
        {
          key: input.key,
          public: input.public,
        }
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              cid: result.Mid,
              filename: input.name,
              size: fileBytes.length,
            }),
          },
        ],
      };
    } catch (error) {
      console.error('Failed to upload file:', error);

      // If it's a Zod validation error, extract the message
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        return {
          content: [
            {
              error: true,
              type: 'text' as const,
              text: JSON.stringify({
                name: 'Error',
                message: firstError.message,
                cause: null,
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            error: true,
            type: 'text' as const,
            text: JSON.stringify({
              name: error instanceof Error ? error.name : 'Error',
              message: error instanceof Error ? error.message : 'Unknown error',
              cause: error instanceof Error && error.cause ? (error.cause as Error).message : null,
            }),
          },
        ],
      };
    }
  },
});
