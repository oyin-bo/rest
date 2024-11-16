// @ts-check

/**
 * @template [T=any]
 * @typedef {{
 *  value: T,
 *  path: string,
 * indent: string,
 *  state: Record<string, any>,
 *  invalidate(): void
 * }} ValueRenderParams<T>
 */

export { renderValue } from './render-value';