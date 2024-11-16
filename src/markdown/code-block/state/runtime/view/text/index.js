// @ts-check

/**
 * @template [T=any]
 * @typedef {{
 *  value: T,
 *  path: string,
 *  state: Record<string, any>,
 *  invalidate(): void
 * }} ObjectRenderParams<T>
 */

export { renderObject } from './render-object';