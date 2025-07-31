// @ts-check
// AST Node Classes for Markdown+HTML parser

export class Node {
  /**
   * @param {number} start
   * @param {number} end
   * @param {number} [lead]
   * @param {number} [trail]
   * @param {CommentNode[]|null} [leadComments]
   * @param {CommentNode[]|null} [trailComments]
   */
  constructor(start, end, lead = 0, trail = 0, leadComments = null, trailComments = null) {
    this.start = start;
    this.end = end;
    this.lead = lead;
    this.trail = trail;
    this.leadComments = leadComments;
    this.trailComments = trailComments;
  }
  /**
   * Returns the raw markdown for this node, including trivia.
   */
  outerMarkdown(source) {
    return source.slice(this.start, this.end);
  }
}

export class TextNode extends Node {
  /**
   * @param {number} start
   * @param {number} end
   * @param {string} [text]
   * @param {number} [lead]
   * @param {number} [trail]
   * @param {CommentNode[]|null} [leadComments]
   * @param {CommentNode[]|null} [trailComments]
   */
  constructor(start, end, text = '', lead = 0, trail = 0, leadComments = null, trailComments = null) {
    super(start, end, lead, trail, leadComments, trailComments);
    this.text = text; // logical text after normalisation
  }
}
TextNode.prototype.type = 'text';
// Lightweight comment node for trivia
export class CommentNode extends Node {
  /**
   * @param {number} start
   * @param {number} end
   * @param {string} value
   */
  constructor(start, end, value) {
    super(start, end);
    this.value = value;
  }
}
CommentNode.prototype.type = 'comment';

export class HeadingNode extends Node {
  constructor(start, end, level, children) {
    super(start, end);
    this.level = level;
    this.children = children;
  }
}
HeadingNode.prototype.type = 'heading';

export class ParagraphNode extends Node {
  constructor(start, end, children) {
    super(start, end);
    this.children = children;
  }
}
ParagraphNode.prototype.type = 'paragraph';

export class HtmlNode extends Node {
  constructor(start, end, children) {
    super(start, end);
    this.children = children;
  }
}
HtmlNode.prototype.type = 'html';

export class TableNode extends Node {
  constructor(start, end, headers, aligns, rows) {
    super(start, end);
    this.headers = headers;
    this.aligns = aligns;
    this.rows = rows;
  }
}
TableNode.prototype.type = 'table';

export class CodeBlockNode extends Node {
  constructor(start, end, lang, value) {
    super(start, end);
    this.lang = lang;
    this.value = value;
  }
}
CodeBlockNode.prototype.type = 'codeBlock';

export class HrNode extends Node {
  constructor(start, end) {
    super(start, end);
  }
}
HrNode.prototype.type = 'hr';

export class ListNode extends Node {
  constructor(start, end, ordered, items) {
    super(start, end);
    this.ordered = ordered;
    this.items = items;
  }
}
ListNode.prototype.type = 'list';

export class ListItemNode extends Node {
  /**
   * @param {number} start
   * @param {number} end
   * @param {any[]} children
   * @param {number} [lead]
   * @param {number} [trail]
   * @param {CommentNode[]|null} [leadComments]
   * @param {CommentNode[]|null} [trailComments]
   */
  constructor(start, end, children, lead = 0, trail = 0, leadComments = null, trailComments = null) {
    super(start, end, lead, trail, leadComments, trailComments);
    this.children = children;
  }
}
ListItemNode.prototype.type = 'listItem';

export class BlockquoteNode extends Node {
  constructor(start, end, children) {
    super(start, end);
    this.children = children;
  }
}
BlockquoteNode.prototype.type = 'blockquote';


