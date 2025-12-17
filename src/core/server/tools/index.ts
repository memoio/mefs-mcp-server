import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { uploadTool } from './upload.js';
import { retrieveTool } from './retrieve.js';
import { MefsConfig } from '../../mefs/config.js';

export const registerTools = (mefsConfig: MefsConfig, server: McpServer) => {
  const tools = [
    retrieveTool(mefsConfig),
    uploadTool(mefsConfig),
  ];

  for (const tool of tools) {
    server.tool(tool.name, tool.description, tool.inputSchema.shape, tool.handler);
  }
};
