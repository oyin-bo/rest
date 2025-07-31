// @ts-check
/**
 * Parse inline elements (emphasis, strong, code, links, images, etc.)
 *
 * @param {import('./parse-base-state.js').ParserState} state
 * @returns {boolean}
 */
export function parseInline(state) {
  const start = state.pos;
  // Emphasis: *text* or _text_
  if ((state.source[state.pos] === '*' || state.source[state.pos] === '_') && state.source[state.pos+1] !== undefined) {
    const marker = state.source[state.pos];
    let strong = false;
    if (state.source[state.pos+1] === marker) { strong = true; state.advance(2); } else { state.advance(); }
    let contentStart = state.pos;
    while (state.pos < state.len && state.source[state.pos] !== marker) state.advance();
    if (strong && state.source[state.pos] === marker && state.source[state.pos+1] === marker) {
      state.nodes.push({ type: 'strong', start, end: state.pos+2, children: [{ type: 'text', start: contentStart, end: state.pos }] });
      state.advance(2);
      return true;
    } else if (!strong && state.source[state.pos] === marker) {
      state.nodes.push({ type: 'em', start, end: state.pos+1, children: [{ type: 'text', start: contentStart, end: state.pos }] });
      state.advance();
      return true;
    }
    state.pos = start;
    return false;
  }
  // Inline code: `code`
  if (state.source[state.pos] === '`') {
    let tickCount = 1;
    let i = state.pos+1;
    while (state.source[i] === '`') { tickCount++; i++; }
    let contentStart = i;
    let end = state.source.indexOf('`'.repeat(tickCount), contentStart);
    if (end !== -1) {
      state.nodes.push({ type: 'code', start, end: end+tickCount, value: state.source.slice(contentStart, end) });
      state.pos = end+tickCount;
      return true;
    }
    return false;
  }
  // Link: [text](url)
  if (state.source[state.pos] === '[') {
    let close = state.source.indexOf(']', state.pos);
    let openParen = state.source.indexOf('(', close);
    let closeParen = state.source.indexOf(')', openParen);
    if (close !== -1 && openParen === close+1 && closeParen !== -1) {
      state.nodes.push({
        type: 'link',
        start,
        end: closeParen+1,
        text: state.source.slice(state.pos+1, close),
        url: state.source.slice(openParen+1, closeParen)
      });
      state.pos = closeParen+1;
      return true;
    }
    return false;
  }
  return false;
}
