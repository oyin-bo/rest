// @ts-check

/**
 * @typedef {Omit<RequestInit, 'body'> &
 * {
 *  ___kind: 'request',
 *  url: string,
 *  body: import('./readable-stream-exact').SerializedReadableStream | undefined
 * }} SerializedRequest
 */

/**
 * @this {{
 *  serializeReadableStreamExact(stream: ReadableStream): import('./readable-stream-exact').SerializedReadableStream
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
 *  deserialize(value: any): any;
 *  deserializeReadableStreamExact(stream: import('./readable-stream-exact').SerializedReadableStream): ReadableStream
 * }}
 * @param {SerializedRequest} serialized
 */
export function deserializeRequest(serialized) {
  const { ___kind, url, body, ...init } = serialized;
  const reqInfo = {
    ...init,
    duplex: 'duplex' in init ? init.duplex : 'half',
    body: body ? this.deserializeReadableStreamExact(body) : undefined
  };

  const req = new Request(url, reqInfo);
  return req;
}
