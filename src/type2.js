// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

import {createSVG, svgBox, svgLine} from './modules/svg.js';

const SHEET = '#sheet';
const W1 = 108;  // cell width with border
const W2 = 105;  // cell width
const W3 = 53;   // cell center
const FW = W1 * 10;  // width of a frame
const FH = W1 * 6;  // height of a frame
const X1 = 70, Y1 = 70;  // top left of upper frame
const Y2 = 70 + FH + W2 - 20;  // top left Y of lower frame

function box(x1, y1, x2, y2, color, width) {
  svgBox(null, x1, y1, x2, y2, color, width, false, SHEET);
}

function line(x1, y1, x2, y2, color, width, dash) {
  svgLine(null, x1, y1, x2, y2, color, width, dash, SHEET);
}


function drawFrame(x, y, color = 'olive', width = 3) {
  box(x, y, x + FW, y + FH, color, width);
  for (let i = 0; i < 10; ++i) {
    line(x + i * W1, y, x + i * W1, y + FH, color, width, false);
  }

  for (let i = 0; i < 6; ++i) {
    line(x, y + i * W1, x + FW, y + i * W1, color, width, false);
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
    line(x + i * W1 + W3, y, x + i * W1 + W3, y + FH, color, width, true);
  }

  for (let i = 0; i < 6; ++i) {
    line(x, y + i * W1 + W3, x + FW, y + i * W1 + W3, color, width, true);
  }
}

function frame() {
  drawFrame(X1, Y1);
  drawFrame(X1, Y2);
}

function getCellPosition(i, j, isUpperFrame) {
  const X = X1;
  const Y = isUpperFrame ? Y1 : Y2;
  return {
    'x': X + i * W1 + 2,
    'y': Y + j * W1 + 2
  };
}

export {frame, getCellPosition, W2 as W};