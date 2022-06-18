// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 *
 * Cubic Bezier computation courtesy of
 * http://www.particleincell.com/2012/bezier-splines/
 */

import {svgBox, svgLine} from './svg.js';

class Cell {
  static W = 108;  // cell width with border
  static RW = 105;  // cell real width
  static C = 53;  // cell center
  static COLOR = 'olive';
  static FRAME_WIDTH = 3;

  static draw(x, y, target) {
    svgBox(
        null, x, y, x + Cell.W, y + Cell.W,
        Cell.COLOR, Cell.FRAME_WIDTH, false, target);
  }
}

class CrossCell extends Cell {
  static COLOR = 'olive';
  static GUIDE_WIDTH = 1;

  static draw(x, y, target) {
    super.draw(x, y, target);
    svgLine(
        null, x + Cell.C, y, x + Cell.C, y + Cell.W,
        CrossCell.COLOR, CrossCell.GUIDE_WIDTH, true, target);
    svgLine(null, x, y + Cell.C, x + Cell.W, y + Cell.C,
        CrossCell.COLOR, CrossCell.GUIDE_WIDTH, true, target);
  }
}

class Frame {
  static draw(x, y, rows, cols, target) {
    for (let i = 0; i < rows; ++i) {
      for (let j = 0; j < cols; ++j) {
        CrossCell.draw(x + j * Cell.W, y + i * Cell.W, target);
      }
    }
  }
}

class Sheet {
  static W = 105;
  static ROWS = 6;
  static COLS = 10;
  static X = 70;
  static Y1 = 70;
  static Y2 = Sheet.Y1 + Cell.W * Sheet.ROWS + Cell.W - 20;

  static draw(target) {
    Frame.draw(Sheet.X, Sheet.Y1, Sheet.ROWS, Sheet.COLS, target);
    Frame.draw(Sheet.X, Sheet.Y2, Sheet.ROWS, Sheet.COLS, target);
  }

  static getCellPosition(row, col, isUpperFrame) {
    const Y = isUpperFrame ? Sheet.Y1 : Sheet.Y2;
    return {
      'x': Sheet.X + col * Cell.W + 2,
      'y': Y + row * Cell.W + 2,
    };
  }
}

class CanvasGuide {
  constructor(width, target) {
    this.target = target;
    this.box(width, 90);
    this.box(width, 80);
    this.box(width, 75);
    this.box(width, 50);
    this.line(0, width / 2, width, width / 2);
    this.line(width / 2, 0, width / 2, width);
    this.line(0, 0, width, width);
    this.line(width, 0, 0, width);
  }

  // Draw box for percentile
  box(width, pct) {
    const l = width * (100 - pct) / 200;
    const r = width - l;
    svgBox(`rc${pct}`, l, l, r, r, 'red', 1, true, this.target);
  }

  line(x1, y1, x2, y2) {
    svgLine(null, x1, y1, x2, y2, 'red', 1, true, this.target);
  }
}

class Guide {
  static drawCanvas(width, target) {
    new CanvasGuide(width, target);
  }
}

export {Guide, Cell, Sheet}
