import { readFile } from 'node:fs/promises';
import { argumentsFor, main, print, rememberSecret } from './lib/output.mjs';
import { configuration, baseUrl, privatePath, UsageError } from './lib/config.mjs';
import { requireOauth } from './lib/oauth.mjs';
await main(async () => {
  const { values, positionals } = argumentsFor({ base: { type: 'string' }, token: { type: 'string' }, 'token-file': { type: 'string' }, list: { type: 'boolean' }, call: { type: 'string' }, protocol: { type: 'string', default: '2026-07-28' } });
  const env = configuration(), base = baseUrl(values.base);
  const stored = values['token-file'] ? (await readFile(privatePath(values['token-file']), 'utf8')).trim() : undefined;
  let fromFile = stored;
  if (stored?.startsWith('{')) {
    try { fromFile = JSON.parse(stored).accessToken; }
    catch { throw new UsageError('Token file is not valid JSON. Run oauth.mjs again.'); }
  }
  const token = rememberSecret(values.token ?? fromFile);
  if (!token) { await requireOauth(env.CLERK_CLI_CLIENT_ID); throw new UsageError('Supply --token or --token-file from oauth.mjs.'); }
  if (!['2026-07-28', '2025-11-25'].includes(values.protocol)) throw new UsageError('Use protocol 2026-07-28 or 2025-11-25.');
  if (!values.list && !values.call) throw new UsageError('Pass --list and/or --call <tool> <json>.');
  let id = 0;
  async function rpc(method, params, notification = false) {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': values.protocol, 'Mcp-Method': method };
    if (params?.name) headers['Mcp-Name'] = params.name;
    const messageId = notification ? undefined : ++id;
    if (values.protocol === '2026-07-28') params = { ...params, _meta: { 'io.modelcontextprotocol/protocolVersion': values.protocol, 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'test-kriyan', version: '1.0.0' } } };
    const response = await fetch(`${base}/mcp`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60_000), headers, body: JSON.stringify({ jsonrpc: '2.0', ...(notification ? {} : { id: messageId }), method, ...(params ? { params } : {}) }) });
    if (!response.ok) throw new UsageError(`MCP HTTP ${response.status}. ${response.status === 401 ? 'Obtain a valid MCP-audience OAuth token with oauth.mjs.' : response.status === 403 ? 'Check the allowed origin.' : 'Check the server configuration.'}`);
    if (notification || response.status === 202 || response.status === 204) return;
    let message;
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '';
      try {
        for (;;) {
          const { value, done } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true }).replaceAll('\r\n', '\n');
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const event = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
            const data = event.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
            if (!data) continue;
            const candidate = JSON.parse(data);
            if (candidate.id === messageId) { message = candidate; break; }
          }
          if (message) break;
        }
      } finally { await reader.cancel(); }
    } else message = await response.json();
    if (!message || message.id !== messageId || message.error) throw new UsageError('MCP returned a protocol error or no matching response. Check protocol version and tool arguments.');
    if (message.result?.isError) { print(message.result); throw new UsageError('MCP tool returned an error. Correct the arguments and retry.'); }
    return message.result;
  }
  // The current transport has no handshake; legacy stateless clients initialize first.
  if (values.protocol === '2025-11-25') {
    await rpc('initialize', { protocolVersion: values.protocol, capabilities: {}, clientInfo: { name: 'test-kriyan', version: '1.0.0' } });
    await rpc('notifications/initialized', undefined, true);
  }
  if (values.list) print(await rpc('tools/list', {}));
  if (values.call) {
    let args; try { args = JSON.parse(positionals[0] ?? '{}'); } catch { throw new UsageError('Tool arguments must be valid JSON.'); }
    print(await rpc('tools/call', { name: values.call, arguments: args }));
  }
});
