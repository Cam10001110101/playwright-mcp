import { env } from 'cloudflare:workers';

import { createMcpAgent } from '@cloudflare/playwright-mcp';

export const PlaywrightMCP = createMcpAgent(env.BROWSER);

// Custom CORS configuration that dynamically determines the origin
const getAllowedOrigin = (request: Request): string => {
  const origin = request.headers.get('Origin');
  // Allow requests from specified domains
  if (origin && (
    origin.endsWith('.mcpcentral.io') ||
    origin.endsWith('.buildaipod.com') ||
    origin.endsWith('.demos.build') ||
    origin === 'https://mcpcentral.io' ||
    origin === 'https://buildaipod.com' ||
    origin === 'https://demos.build'
  )) {
    return origin;
  }
  // Default to * for other origins
  return '*';
};

// CORS options compatible with McpAgent's CORSOptions interface
const corsOptions = {
  origin: '*', // We'll override this dynamically
  headers: 'Content-Type, mcp-session-id, mcp-protocol-version',
  methods: 'GET, POST, OPTIONS',
  exposeHeaders: 'mcp-session-id',
  maxAge: 86400
};

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const { pathname }  = new URL(request.url);

    // Get the allowed origin for this request
    const allowedOrigin = getAllowedOrigin(request);
    
    // Update CORS options with the dynamic origin
    const dynamicCorsOptions = {
      ...corsOptions,
      origin: allowedOrigin
    };

    switch (pathname) {
      case '/sse':
      case '/sse/message':
        return PlaywrightMCP.serveSSE('/sse', { corsOptions: dynamicCorsOptions }).fetch(request, env, ctx);
      case '/mcp':
        return PlaywrightMCP.serve('/mcp', { corsOptions: dynamicCorsOptions }).fetch(request, env, ctx);
      default:
        return new Response('Not Found', { status: 404 });
    }
  },
};
