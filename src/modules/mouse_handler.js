// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

import {Canvas} from './canvas.js';
import {EditorState} from './editor_state.js';
import {GlyphEditor} from './glyph_editor.js';
import {StrokeEditor} from './stroke_editor.js';

class MouseHandler {
  static instance;

  static get() {
    if (MouseHandler.instance == undefined) {
      MouseHandler.instance = new MouseHandler();
    }
    return MouseHandler.instance;
  }

  constructor() {
    this.clear();
  }

  clear() {
    this.tracking = false;
    this.lastX = undefined;
    this.lastY = undefined;
    this.currentStroke = undefined;
  }

  install() {
    $(Canvas.main).on('mouseup', this.mouseup.bind(this));
    $(Canvas.main).on('mousemove', this.mousemove.bind(this));
    $(Canvas.main).on('mousedown', this.mousedown.bind(this));
  }

  ensureStroke() {
    if (this.currentStroke !== undefined) {
      this.currentStroke.deactivate(Canvas.main);
    }
    this.currentStroke =
        StrokeEditor.get().getNewStroke(
            GlyphEditor.current().getNumberOfStrokes());
    this.currentStroke.activated = true;
  }

  setStroke(s) {
    this.currentStroke = s;
  }

  unsetStroke() {
    this.currentStroke = undefined;
  }

  mouseup(e) {
    if (e.button != 0 || !this.tracking) return;

    if (EditorState.state == EditorState.DRAW) {
      this.drawMouseup(e);
    } else {
      this.tuneMouseup(e);
    }
    GlyphEditor.get().updatePreviews();
  }

  drawMouseup(e) {
    this.currentStroke.drawDot(Canvas.main, e.offsetX, e.offsetY);
    this.tracking = false;
    if (!this.currentStroke.isEmpty()) {
      this.currentStroke.finish(Canvas.main);
      GlyphEditor.current().addStroke(this.currentStroke);
    }
  }

  tuneMouseup(e) {
    this.currentStroke.unselectDot();
    this.tracking = false;
  }

  mousemove(e) {
    if (EditorState.state == EditorState.DRAW) {
      this.drawMousemove(e);
    } else {
      this.tuneMousemove(e);
    }
  }

  drawMousemove(e) {
    if (this.tracking && this.currentStroke) {
      // pick points have at least delta of 20pt
      const ptX = e.offsetX;
      const ptY = e.offsetY;
      if (Math.max(
          Math.abs(ptX - this.lastX), Math.abs(ptY - this.lastY)) > 30) {
        this.currentStroke.drawDot(Canvas.main, ptX, ptY);
        this.lastX = ptX;
        this.lastY = ptY;
      }
    }
  }

  tuneMousemove(e) {
    if (this.tracking && this.currentStroke) {
      this.currentStroke.moveDot(e.clientX, e.clientY);
    }
  }

  mousedown(e) {
    if (e.button != 0) return;

    if (EditorState.state == EditorState.DRAW) {
      this.drawMousedown(e);
    } else {
      this.tuneMousedown(e);
    }
  }

  drawMousedown(e) {
    this.tracking = true;
    this.ensureStroke();
    this.currentStroke.drawDot(Canvas.main, e.offsetX, e.offsetY);
    this.lastX = e.offsetX;
    this.lastY = e.offsetY;
  }

  tuneMousedown(e) {
    if (this.currentStroke === undefined) {
      return;
    }

    const stroke = this.currentStroke;
    if (EditorState.state == EditorState.MOVE) {
      if (stroke.selectDot(e.clientX, e.clientY)) {
        this.tracking = true;
      }
    } else if (EditorState.state == EditorState.DELETE) {
      if (stroke.selectDot(e.clientX, e.clientY)) {
        stroke.removeDot();
        GlyphEditor.get().updatePreviews();
      }
    }
  }
}

export {MouseHandler}