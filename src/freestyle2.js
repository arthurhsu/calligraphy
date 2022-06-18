// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

import {Cell, Frame, Sheet} from './modules/guide.js';
import {Glyph} from './modules/glyph.js';
import {Util} from './modules/util.js'

function renderGlyph(json, i, j, cols, vertical, fade) {
  const row = vertical ? j : i;
  const col = vertical ? cols - i - 1 : j;
  const color = fade ? 'cyan' : 'blue';
  const pos = Sheet.getCellPosition(row, col, true);
  const svgId = `#g${row}_${col}`;
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

function generateSheet() {
  const contents = $('#contents').val().split('\n');
  const lines = contents.length;
  const maxLine = Math.max(...(contents.map(l => l.length)));

  $('#sheet').empty();
  const vertical = $('#vertical').is(':checked');
  const fade = $('#fade').is(':checked');

  const rows = vertical ? maxLine : lines;
  const cols = vertical ? lines : maxLine;

  Frame.draw(Sheet.X, Sheet.Y1, rows, cols, '#sheet');
  contents.forEach((l, i) => {
    const promises = [...l].map(c => Util.fetchGlyph(c));
    return Promise.all(promises).then(jsons => {
      for (let j = 0; j < jsons.length; ++j) {
        if (!jsons[j]) continue;
        renderGlyph(jsons[j], i, j, cols, vertical, fade);
      }
    });
  });
}

function setup() {
  $('#gen').on('click', () => {
    generateSheet();
  });

  $('#print').on('click', () => {
    window.print();
  });
}

export {setup}