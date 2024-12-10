// @ts-check

import { renderComposite } from './render-composite';
import { renderValue } from './render-value';
import { formatTagWidget } from './format-tags';

import './render-element.css';
import { loadCorsIframe } from '../../../../../../iframe-worker/load-cors-iframe';

/**
 * @param {import('.').ValueRenderParams<import('../../../../../../iframe-worker/serialize/remote-objects').SerializedElement>} params
 */
export function renderElement(params) {
      const toggleWidget = formatTagWidget({
        ...params,
        json: (value, state) => {
          return renderComposite({
            ...params,
            value,
            state
          });
        },
        formats: {
          tree: createDOMTreeFormatter,
          visual: createDOMVisualFormatter
        }
      });
  
  const output = toggleWidget(params.value, params.state);
  if (toggleWidget.view === 'tree') {
    const domOutput = renderElementAsDOM(params);
    if (Array.isArray(domOutput)) output.push(...domOutput);
    else output.push(domOutput);
  }

  return output;

  function createDOMTreeFormatter() {
    const btn = document.createElement('span');
    btn.textContent = '</>';

    return apply;

    function apply(value, state) {
      return {
        preference: 1,
        button: btn,
        render: () => undefined
      };
    }
  }

  function createDOMVisualFormatter() {
    const btn = document.createElement('span');
    btn.textContent = '👁️';

    /**
     * @type {Promise | { iframe: HTMLIFrameElement, origin: string, then?: never }}
     */
    var iframeOrPromise;

    return apply;

    function apply(value, state) {
      if (!iframeOrPromise) {
        iframeOrPromise = loadCorsIframe().then(iframe => {
          iframeOrPromise = iframe;
          params.invalidate();
        });
      }

      return {
        preference: 0.5,
        button: btn,
        render: () => {
          if (iframeOrPromise?.then) {
            const loading = document.createElement('span');
            loading.className = 'hi-element-visual-loading';
            loading.textContent = '...';
            return loading;
          }

          const iframeWrapper = document.createElement('div');
          iframeWrapper.appendChild(iframeOrPromise.iframe);

          return iframeWrapper;
        }
      }
    }
  }
}

const MAX_TAG_LINE_LENGTH = 150;

/**
 * @param {import('.').ValueRenderParams<import('../../../../../../iframe-worker/serialize/remote-objects').SerializedElement>} params
 */
export function renderElementAsDOM(params) {
  const posTag = (params.value.openingLine?.toLowerCase() || '').indexOf(params.value.tagName?.toLowerCase() || '');
  if (!params.value.tagName || posTag < 0) return renderComposite(params);

  const preLeadText = params.value.openingLine.slice(0, posTag);
  const tag = params.value.tagName.toLowerCase();
  const postTagLead = params.value.openingLine.slice(posTag + tag.length);

  /** @type {(import('..').RenderedContent)[]} */
  const output = [
    {
      widget: () => {
        const btn = document.createElement('button');
        btn.className = 'hi-element-pre-opening-tag';
        btn.textContent = preLeadText;
        btn.onclick = () => {
          btn.textContent = '...loading ' + preLeadText;
          const iframe = document.createElement('iframe');
          
        };
        return btn;
      }
    },
    { class: 'hi-element-opening-tag', textContent: tag }
  ];

  if (postTagLead.length <= MAX_TAG_LINE_LENGTH) {
    output.push({
      class:
        params.value.childCount ? 'hi-element-post-opening-tag' :
          'hi-element-post-opening-and-closing-tag',
      textContent: postTagLead
    });
  } else {
    const lead = postTagLead.slice(0, Math.floor(MAX_TAG_LINE_LENGTH * 0.6));
    const trail = postTagLead.slice(postTagLead.length - (MAX_TAG_LINE_LENGTH - lead.length - 1));

    output.push({
      class:
        params.value.childCount ? 'hi-element-post-opening-tag-lead' :
          'hi-element-post-opening-and-closing-tag-lead',
      textContent: lead
    });

    output.push({
      class:
        params.value.childCount ? 'hi-element-post-opening-tag-ellipsis' :
          'hi-element-post-opening-and-closing-tag-ellipsis',
      textContent: '...'
    });

    output.push({
      class:
        params.value.childCount ? 'hi-element-post-opening-tag' :
          'hi-element-post-opening-and-closing-tag',
      textContent: trail
    });
  }
  
  if (params.value.childCount) {
    const children = params.state[params.path + '.children'];
    const visualIframe = params.state[params.path + '.iframe'];
    const showIframe = params.state[params.path + '.showIframe'];
    if (showIframe) {
      if (!visualIframe) {
        output.push({
          widget: () => {
            const ellipsisSpan = document.createElement('span');
            ellipsisSpan.textContent = '... loading';
            return ellipsisSpan;
          }
        });
      } else {
        output.push({
          widget: () => {
            return visualIframe;
          }
        });
      }
    }

    if (!children) {
      output.push(
        {
          widget: () => {
            const btn = document.createElement('button');
            btn.className = 'hi-element-child-count';
            btn.textContent = '...[' + params.value.childCount.toLocaleString() + ']';
            btn.onclick = async () => {
              if (params.value.getChildren) {
                btn.textContent = '...[' + params.value.childCount.toLocaleString() + '] . . . '
                params.invalidate();
                const children = await params.value.getChildren();
                params.state[params.path + '.children'] = children;
                params.invalidate();
              }
            };
            return btn;
          }
        });
    } else {
      if (children.length) {
        for (let iChild = 0; iChild < children.length; iChild++) {
          const child = children[iChild];
          output.push('\n    ' + params.indent);
          const renderer =
            child && child.___kind === 'Element' ? renderElementAsDOM :
              renderValue;
          const childOutput = renderer({
            ...params,
            path: params.path + '.children[' + iChild + ']',
            indent: params.indent + '    ',
            value: child
          });

          if (childOutput) {
            if (Array.isArray(childOutput)) output.push(...childOutput);
            else output.push(childOutput);
          }
        }
        output.push('\n' + params.indent);
      }
    }
    
    output.push({ class: 'hi-element-pre-closing-tag', textContent: '</' });
    output.push({ class: 'hi-element-closing-tag', textContent: tag });
    output.push({ class: 'hi-element-post-closing-tag', textContent: '>' });
  }

  return output;
}