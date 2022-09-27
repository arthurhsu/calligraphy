// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

import {Canvas} from './canvas.js';
import {EditorState} from './editor_state.js';
import {GlyphEditor} from './glyph_editor.js';
import {Stroke} from './stroke.js';
import {MouseHandler} from './mouse_handler.js';

class StrokeEditor {
  static instance;
  static get() {
    if (StrokeEditor.instance === undefined) {
      StrokeEditor.instance = new StrokeEditor();
    }
    return StrokeEditor.instance;
  }

  constructor() {
    this.radioGroup = undefined;
    this.strokeSelector = undefined;
    this.currentStroke = undefined;
  }

  clear() {
    $(`input[name=${this.radioGroup}][value='draw']`).prop('checked', true);
    if (this.strokeSelector) {
      $(this.strokeSelector).empty();
    }
  }

  install(strokeSelector, editingRadio, undoBtn, eraseBtn, addBtn) {
    this.strokeSelector = strokeSelector;
    $(strokeSelector).on('change', this.onChange.bind(this));

    $(`input:radio[name=${editingRadio}]`).on('click', () => {
      const val = $(`input:radio[name=${editingRadio}]:checked`).val();
      EditorState.state = val;
    });
    this.radioGroup = editingRadio;

    $(undoBtn).on('click', this.undo.bind(this));
    $(eraseBtn).on('click', this.erase.bind(this));
    $(addBtn).on('click', this.addDot.bind(this));
  }

  onChange() {
    if (this.currentStroke !== undefined) {
      this.currentStroke.deactivate(Canvas.main);
    }

    this.currentStroke =
        GlyphEditor.current().getStroke($(this.strokeSelector).val());
    this.currentStroke.activate(Canvas.main);
    MouseHandler.get().setStroke(this.currentStroke);
  }

  undo(e) {
    switch (EditorState.state) {
      case EditorState.DRAW:
        const index = GlyphEditor.get().removeLastStroke();
        if (index > 0) {
          $(`${this.strokeSelector} option[value='${index}']`).remove();
        }
        break;

      case EditorState.DELETE:
        // TODO
        break;

      case EditorState.MOVE:
        // TODO
        break;

      default:
        break;
    }
  }

  erase(e) {
    if (EditorState.state != EditorState.DRAW) {
      return;
    }

    if (this.currentStroke && this.currentStroke.activated) {
      const index = $(this.strokeSelector).val();
      if (!confirm(`Remove stroke S${index}?`)) return;
      if (GlyphEditor.get().removeStroke(index) >= 0) {
        $(`${this.strokeSelector} option:last`).remove();
      }
    }
  }

  addDot(e) {
    if (EditorState.state != EditorState.DRAW) {
      return;
    }

    if (this.currentStroke && this.currentStroke.activated) {
      this.currentStroke.addDot(Canvas.main);
    }
  }

  inflate(glyph) {
    // The glyph is just loaded, inflate the stroke info
    for (let i = 0; i < glyph.getNumberOfStrokes(); ++i) {
      $(this.strokeSelector).append(`<option value=${i}>S${i}</option>`);
    }
    $(this.strokeSelector).val(glyph.getNumberOfStrokes() - 1);
    this.onChange();
  }

  getNewStroke(id) {
    $(this.strokeSelector).append(`<option value=${id}>S${id}</option>`);
    $(this.strokeSelector).val(id);
    const ret = new Stroke(id);
    this.currentStroke = ret;
    return ret;
  }
}

export {StrokeEditor}