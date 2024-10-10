// @ts-check

import { getCodeBlockRegionsOfEditorState } from '../../state-block-regions';
import { createRemoteExecutionRuntime } from './remote-execution-runtime';

export class ExecutiveManager {

  /**
   * @param {import('@milkdown/prose/state').EditorStateConfig} config
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  constructor(config, editorState) {
    this.config = config;
    this.codeBlockRegions = getCodeBlockRegionsOfEditorState(editorState);
    if (!this.codeBlockRegions) this.codeBlockRegions = { codeBlocks: [], codeOnlyIteration: -1 };
    this.codeBlockRegions.codeOnlyIteration = -1;
    this.liveExecutionState = createRemoteExecutionRuntime();
  }

  /**
   * @param {import('@milkdown/prose/state').Transaction} tr
   * @param {import('@milkdown/prose/state').EditorState} oldEditorState
   * @param {import('@milkdown/prose/state').EditorState} newEditorState
   */
  apply(tr, oldEditorState, newEditorState) {
    this.checkAndRerun(newEditorState);
  }

  /**
   * @param {import('@milkdown/prose/view').EditorView} editorView
   */
  initEditorView(editorView) {
    this.editorView = editorView;
    this.checkAndRerun(editorView.state);
  }

  /**
   * @param {import('@milkdown/prose/state').EditorState} editorState
   */
  checkAndRerun(editorState) {
    const prevCodeOnlyIteration = this.codeBlockRegions.codeOnlyIteration;
    this.codeBlockRegions = getCodeBlockRegionsOfEditorState(editorState) || this.codeBlockRegions;
    if (!this.editorView) {
      this.codeBlockRegions.codeOnlyIteration = -1;
      return;
    }

    if (this.codeBlockRegions.codeOnlyIteration === prevCodeOnlyIteration) return;
    this.liveExecutionState.executeCodeBlocks(this.editorView);
  }
}