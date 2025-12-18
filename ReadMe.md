# MEFS-MCP-SERVER

MEMO MCP Server provides a standard storage interface for AI agents, allowing AI agents to save generated content to MEFS and providing data retrieval capabilities. It provides decentralized storage for AI agents.

## Use Cases

- Encrypted data storage: Store AI-generated content to MEFS.
- User context retrieval: Store user behavior and preference data to MEFS, and quickly retrieve relevant user data in subsequent requests to provide to AI agents.
- Seamless data sharing: AI agents can achieve trustless data sharing through content identifiers (CID).

## Free Quota

Start using mefs-storage now and enjoy 10GB of free storage space.

## Quick Installation Guide

You can follow the steps below to install the MCP server. Before using the MEFS MCP server, please ensure you have created an EVM private key.

### Prerequisites

Before using the MEFS MCP server, please ensure you have created an EVM private key. You can use EVM wallets such as [MetaMask](https://metamask.io/) or [Okx Wallet](https://web3.okx.com/) to create a wallet and obtain your private key.

### Clone Repository

```bash
git clone https://github.com/memoio/mefs-mcp-server.git && cd mefs-mcp-server
```

### Install Dependencies

```bash
pnpm install
```

### Build

```bash
pnpm run build
```

### Configure MCP Server (Private Key Required)

You can start the MCP server in your client using the following configuration:

**Standard Configuration** - Suitable for most clients

```json
{
  "mcpServers": {
    "storacha-storage-server": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "MCP_TRANSPORT_MODE": "stdio",
        "MEFS_PRIVATE_KEY": "<YOUR-PRIVATE-KEY>",
      },
      "shell": true,
      "cwd": "./",
    },
  },
}
```

Replace YOUR-PRIVATE-KEY with your EVM private key.

## Using MCP Tools

MEFS MCP Server provides the following tools to interact with the decentralized storage network MEFS:

### Upload

Upload files to MEFS:

```js
// Example usage in an AI application
const result = await uploadFile({  
        file: base64EncodedContent,  
        name: "document.pdf", 
    });
```

Parameters:

- `file`: Base64-encoded file content
- `name`: Filename with extension

### Retrieve

Retrieve files from the MEFS network:

```javascript
// Example retrieval by CID
const document = await retrieveFile({  cid: "bafybei...gq5a/document.pdf"});
```

Parameters:

- `cid`: Unique identifier of the file

### Check Remaining Space

Check remaining storage space:

```javascript
const identity = await getSpace({});
```
