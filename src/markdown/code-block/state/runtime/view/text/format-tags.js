/**
 * @typedef {{
 *  path: string,
 *  state: Record<string, any>,
 *  invalidate: () => void,
 *  formats: { [format: string]: FormatTagOption }
 * }} FormatTagParams
 */

/**
 * @typedef {{
 *  button: (tagButton: HTMLElement, selected: boolean) => void,
 *  content: () => import('..').RenderedContent[] | import('..').RenderedContent
 *  onSelected?: () => void
 * }} FormatTagOption
 */

const TAG_WIDGET_SUFFIX = '.tagWidget';

/**
 * @param {FormatTagParams} params
 */
export function formatTagWidget(params) {
  /** @type {import('..').RenderedWidget & { viewType: string } | undefined} */
  let toggleWidget = params.state[TAG_WIDGET_SUFFIX];
  if (!toggleWidget) {
    toggleWidget = {
      viewType: 'json',
      widget: () => {
        const togglePanel = document.createElement('span');
        togglePanel.className = 'inline-view-toggle-panel';

        const jsonButton = createTagToggle('json', {
          button: () => {},
          content: () => null
        });
        jsonButton.textContent = '{}';
        togglePanel.appendChild(jsonButton);

        for (const [format, option] of Object.entries(params.formats)) {
          createTagToggle(format, option);
        }

        return togglePanel;
      }
    };
  }

  return toggleWidget;

  /**
   * @param {string} format
   * @param {FormatTagOption} option
   */
  function createTagToggle(format, option) {
    const tagButton = document.createElement('button');
    tagButton.className =
      'inline-view-toggle-button inline-view-toggle-button-' + format +
      (viewType !== 'json' ? '' :
        ' inline-view-toggle-button-selected inline-view-toggle-button-json-selected');
    tagButton.textContent = format;
    option.button(tagButton, viewType === format);

    togglePanel.appendChild(tagButton);
    tagButton.onclick = () => {
      toggleWidget.viewType = format;
      option.onSelected?.();
      params.invalidate();
    };
 }
}