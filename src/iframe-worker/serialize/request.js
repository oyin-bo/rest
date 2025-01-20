// @ts-check

/**
 * @typedef {Omit<RequestInit, 'body'> &
 * {
 *  ___kind: 'request',
 *  url: string,
 *  body: SerializedReadableStream | undefined
 * }} SerializedRequest
 */

/**
 * @this {{
 *  serializeReadableStreamExact(stream: ReadableStream): SerializedReadableStream
 * }}
 * @param {Request} req
 */
export function serializeRequest(req) {
  return {
    ___kind: 'request',
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers?.entries?.() || []),
    referrer: req.referrer,
    referrerPolicy: req.referrerPolicy,
    mode: req.mode,
    credentials: req.credentials,
    cache: req.cache,
    redirect: req.redirect,
    integrity: req.integrity,
    keepalive: req.keepalive,
    body: req.body ? this.serializeReadableStreamExact(req.body) : undefined
  };
}

/**
 * @this {{
 *  deserializeReadableStreamExact(stream: SerializedReadableStream): ReadableStream
 * }}
 * @param {SerializedRequest} req
 */
export function deserializeRequest(req) {
  const { url, body, ...init } = req;
  return new Request(url, { ...init, body: body ? this.deserializeReadableStreamExact(body) : undefined });
}
