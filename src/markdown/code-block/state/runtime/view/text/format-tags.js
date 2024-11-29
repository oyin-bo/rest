// @ts-check

/**
 * @typedef {{
 *  path: string,
 *  state: Record<string, any>,
 *  invalidate(): void,
 *  formats: { [format: string]: () => (value: any) => FormatTagOption },
 *  json: (value: any) => import('..').RenderedContent[]
 * }} FormatTagParams
 */

/**
 * @typedef {{
 *  preference: number,
 *  button: HTMLElement,
 *  render: import('..').RenderedContent[] | import('..').RenderedContent
 * }} FormatTagOption
 */

const TAG_WIDGET_SUFFIX = '.tagWidget';
const TAG_VIEW_SUFFIX = '.tagView';

/**
 * @param {FormatTagParams} params
 */
export function formatTagWidget(params) {

  /** @type {ReturnType<typeof createToggleWidget> | undefined} */
  let toggleWidget = params.state[TAG_WIDGET_SUFFIX];
  if (!toggleWidget) {
    toggleWidget = createToggleWidget();
  }

  return toggleWidget;

  function createToggleWidget() {
    const togglePanel = document.createElement('span');
    togglePanel.className = 'inline-view-toggle-panel';
    let carryValue;

    const jsonButton = createTagToggle('json');
    jsonButton.textContent = '{}';

    jsonButton.onclick = () => {
      params.state[params.path + TAG_VIEW_SUFFIX] = bindValue.view = 'json';
      params.invalidate();
    };

    /** @type {{ format: string, apply(value: any): FormatTagOption, button: HTMLElement }[]} */
    const formatters = [];

    for (const [format, ctor] of Object.entries(params.formats)) {
      const button = createTagToggle(format);
      togglePanel.appendChild(button);
      const apply = ctor();
      formatters.push({ format, apply, button });

      button.onclick = () => {
        params.state[params.path + TAG_VIEW_SUFFIX] = bindValue.view = format;
        params.invalidate();
      };
    }

    togglePanel.appendChild(jsonButton);

    bindValue.view = 'json';

    return bindValue;

    function bindValue(value) {
      carryValue = value;
      const applied = formatters.map(fmt => fmt.apply(value));
      let bestFormatIndex = -1;

      const availableTags = [];

      for (let iFormat = 0; iFormat < applied.length; iFormat++) {
        const appliedFmt = applied[iFormat];
        const fmt = formatters[iFormat];
        if (appliedFmt.preference > 0) {
          availableTags[iFormat] = true;
          fmt.button.style.display = /** @type {*} */(null);
          if (fmt.button.firstChild !== appliedFmt.button) {
            fmt.button.textContent = '';
            fmt.button.appendChild(appliedFmt.button);
          }
          if (bestFormatIndex < 0 || appliedFmt.preference > applied[bestFormatIndex].preference)
            bestFormatIndex = iFormat;
        } else {
          availableTags[iFormat] = false;
          fmt.button.style.display = 'none';
        }
      }

      const stateView = params.state[params.path + TAG_VIEW_SUFFIX];
      if (stateView) {
        let retainStateFormatIndex = formatters.findIndex(fmt => fmt.format === stateView);
        if (retainStateFormatIndex >= 0 && availableTags[retainStateFormatIndex] || stateView === 'json')
          bestFormatIndex = retainStateFormatIndex;
      }

      if (bestFormatIndex < 0) {
        params.state[params.path + TAG_VIEW_SUFFIX] = bindValue.view = 'json';
        jsonButton.classList.add('inline-view-toggle-button-selected');
      } else {
        jsonButton.classList.remove('inline-view-toggle-button-selected');
      }

      for (let iFormat = 0; iFormat < applied.length; iFormat++) {
        const appliedFmt = applied[iFormat];
        const fmt = formatters[iFormat];
        if (iFormat === bestFormatIndex) fmt.button.classList.add('inline-view-toggle-button-selected');
        else fmt.button.classList.remove('inline-view-toggle-button-selected');
      }

      const subsequent = bestFormatIndex < 0 ?
        params.json(value) :
        applied[bestFormatIndex].render;

      let combined =
        !subsequent ? [{ widget: togglePanel }] :
          Array.isArray(subsequent) ? [{ widget: togglePanel }, ...subsequent] :
            [{ widget: togglePanel }, subsequent];

      return combined;
    }
  }

  /**
   * @param {string} format
   */
  function createTagToggle(format) {
    const tagButton = document.createElement('button');
    tagButton.className =
      'inline-view-toggle-button inline-view-toggle-button-' + format;
    tagButton.textContent = format;
    return tagButton;
  }
}