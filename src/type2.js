// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

import {createSVG, svgBox, svgLine} from './modules/svg.js';

const SHEET = '#sheet';

function box(x1, y1, x2, y2, color, width) {
  svgBox(null, x1, y1, x2, y2, color, width, false, SHEET);
}

function line(x1, y1, x2, y2, color, width, dash) {
  svgLine(null, x1, y1, x2, y2, color, width, dash, SHEET);
}

const W1 = 108;
const W2 = 105;
const W3 = 53;
const X = W1 * 10;
const Y = W1 * 6;

function drawFrame(x, y, color = 'olive', width = 3) {
  box(x, y, x + X, y + Y, color, width);
  for (let i = 0; i < 10; ++i) {
    line(x + i * W1, y, x + i * W1, y + Y, color, width, false);
  }

  for (let i = 0; i < 6; ++i) {
    line(x, y + i * W1, x + X, y + i * W1, color, width, false);
  }

  /*
  for (let i = 0; i < 10; ++i) {
    for (let j = 0; j < 6; ++j) {
      box(x + i*W1+2, y + j*W1+2, x + i*W1+W2, y + j*W1 + W2, 'blue', 1);
    }
  }
  */

  drawCrossGuide(x, y, color);
}

function drawCrossGuide(x, y, color = 'olive', width = 1) {
  for (let i = 0; i < 10; ++i) {
    line(x + i * W1 + W3, y, x + i * W1 + W3, y + Y, color, width, true);
  }

  for (let i = 0; i < 6; ++i) {
    line(x, y + i * W1 + W3, x + X, y + i * W1 + W3, color, width, true);
  }
}

function main() {
  drawFrame(70, 70);
  drawFrame(70, 70 + Y + W2 - 20);
}

export {main};