// @ts-check

/**
 * @typedef {Partial<Omit<Response, 'body' | 'headers'>> &
 * {
 *  ___kind: 'response',
 *  headers: Record<string, string | string[]>,
 *  body: SerializedReadableStream | undefined
 * }} SerializedResponse
 */

/**
 * @this {{
 *  serializeReadableStreamExact(stream: ReadableStream): SerializedReadableStream
 * }}
 * @param {Response} response
 * @returns {SerializedResponse}
 */
export function serializeResponse(response) {
  return {
    ___kind: 'response',
    url: response.url,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers?.entries?.() || []),
    ok: response.ok,
    redirected: response.redirected,
    type: response.type,
    body: response.body ? this.serializeReadableStreamExact(response.body) : undefined
  }
}

/**
 * @this {{
 *  deserializeReadableStreamExact(stream: SerializedReadableStream): ReadableStream
 * }}
 * @param {SerializedResponse} serialized
 * @returns {Response}
 */
export function deserializeResponse(serialized) {
  const { body, ...rest } = serialized;
  const bodyStream = body ? this.deserializeReadableStreamExact(body) : undefined;
  const res = bodyStream ? new Response(bodyStream) : new Response();
  for (const k in rest) {
    res[k] = rest[k];
  }

  return res;
}