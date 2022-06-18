// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

import {Util} from './modules/util.js';
import {Glyph} from './modules/glyph.js';
import {Cell, Sheet} from './modules/guide.js';

function getChars(selector) {
  const text = $(selector).val().toString().trim().substring(0, 10);
  return text;
}

function renderGlyph(json, row, i, isUpperFrame, color='blue') {
  const idx = isUpperFrame ? 0 : 1;
  const pos = Sheet.getCellPosition(row, i, isUpperFrame);
  const svgId = `#g${idx}${row}${i}`;
  const W = Cell.RW;
  const svgHtml = '<svg xmlns="http://www.w3.org/2000/svg"' +
      ' xmlns:xlink="http://www.w3.org/1999/xlink"' +
      ` viewBox="0 0 512 512" x=${pos['x']} y=${pos['y']}` +
      ` width=${W}px height=${W}px id="${svgId.substring(1)}"></svg>`;
  $('#sheet').append(svgHtml);
  const glyph = new Glyph().deserialize(svgId, json.glyphs[0]);
  glyph.renderStrokes(svgId, color);
  return svgId;
}

function fetchGlyphs(s, isUpperFrame) {
  const promises = [...s].map(c => Util.fetchGlyph(c));
  return Promise.all(promises).then(jsons => {
    for (let i = 0; i < jsons.length; ++i) {
      if (!jsons[i]) continue;
      renderGlyph(jsons[i], 0, i, isUpperFrame);
      for (let j = 1; j < 3; ++j) {
        renderGlyph(jsons[i], j, i, isUpperFrame, 'cyan');
      }
    }
  });
}

function generateSheet(charsUpper, charsLower) {
  fetchGlyphs(charsUpper, true);
  fetchGlyphs(charsLower, false);
}

function setup() {
  $('#start').on('click', () => {
    const charsUpper = getChars('#upper');
    const charsLower = getChars('#lower');
    generateSheet(charsUpper, charsLower);
  });

  $('#print').on('click', () => {
    window.print();
  });

  Sheet.draw('#sheet');
}

export {setup}