// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 *
 * Cubic Bezier computation courtesy of
 * http://www.particleincell.com/2012/bezier-splines/
 */

import {svgBox, svgLine} from './svg.js';

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

export {Guide}
