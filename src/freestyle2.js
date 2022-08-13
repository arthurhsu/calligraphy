// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

import {Cell, Frame, Sheet} from './modules/guide.js';
import {Glyph} from './modules/glyph.js';
import {Util} from './modules/util.js'

class FreeStyle {
  constructor() {
    this.cachedGlyphs = new Map();
    this.contents = [];
    this.lines = 0;
    this.maxLine = 0;
  }

  renderGlyph(json, i, j, index) {
    const vertical = $('#vertical').is(':checked');
    const fade = $('#fade').is(':checked');
    const cols = vertical ? this.lines : this.maxLine;

    const row = vertical ? j : i;
    const col = vertical ? cols - i - 1 : j;
    const color = fade ? 'cyan' : 'blue';
    const pos = Sheet.getCellPosition(row, col, true);
    const svgId = `#g${row}_${col}`;
    $(svgId).remove();
    const W = Cell.RW;
    const svgHtml = '<svg xmlns="http://www.w3.org/2000/svg"' +
        ' xmlns:xlink="http://www.w3.org/1999/xlink"' +
        ` viewBox="0 0 512 512" x=${pos['x']} y=${pos['y']}` +
        ` width=${W}px height=${W}px id="${svgId.substring(1)}"></svg>`;
    $('#sheet').append(svgHtml);
    const glyph = new Glyph().deserialize(json.glyphs[index]);
    glyph.renderStrokes(svgId, false, color);
    return svgId;
  }

  parseAndFetch() {
    const raw = $('#contents').val() || '';
    this.contents = raw.toString().split('\n');
    this.lines = this.contents.length;
    this.maxLine = Math.max(...(this.contents.map(l => l.length)));

    const toFetch = new Set();
    this.contents.forEach(line => {
      [...line].forEach(c => {
        if (!this.cachedGlyphs.has(c)) {
          toFetch.add(c);
        }
      }, this);
    }, this);
    const promises = [...toFetch.values()].map(c => Util.fetchGlyph(c));
    let i = 0;
    return Promise.all(promises).then(jsons => {
      jsons.forEach(j => {
        if (j) {
          this.cachedGlyphs.set(j['text'], j);
        }
      });
    });
  }

  hasMultiGlyph() {
    return [...this.cachedGlyphs.values()].some(v => v['glyphs'].length > 1);
  }

  renderSelection() {
    const chars =
        [...this.cachedGlyphs.values()]
            .filter(v => v['glyphs'].length > 1)
            .map(v => v['text']);
    $('#char').empty();
    chars.forEach(c => {
      let html = `<option value=${c}>${c}</option>`;
      $('#char').append(html);
    });
    $(`#char option[value=${chars[0]}]`).attr('selected', 'selected');
    $(`#char`).trigger('change');
  }

  multiChar() {
    const sc = $('#char').val();
    let options = [];
    this.contents.forEach((l, i) => {
      [...l].forEach((c, j) => {
        if (c == sc) {
          options.push(`<option value='${i},${j}'>${i},${j}</option>`);
        }
      });
    });
    $('#coord').empty();
    $('#coord').append(options.join(''));

    options = [];
    const json = this.cachedGlyphs.get(sc);
    json['glyphs'].forEach((g, i) => {
      const tags = g['tags'].join(' ');
      options.push(`<option value='${i}'>${i}: ${tags}</option>`);
    });
    $('#choice').empty();
    $('#choice').append(options);
    // TODO: set proper initial selection
  }

  multiChange() {
    let raw = $('#coord').val();
    if (raw) {
      const coord = raw.toString().split(',');
      const i = coord[0];
      const j = coord[1];
      raw = $('#choice').val()?.toString() || '0';
      const index = parseInt(raw);
      const json = this.cachedGlyphs.get($('#char').val());
      this.renderGlyph(json, i, j, index);
    }
  }

  generateSheet() {
    $('#sheet').empty();
  
    this.parseAndFetch().then(() => {
      const vertical = $('#vertical').is(':checked');
      const rows = vertical ? this.maxLine : this.lines;
      const cols = vertical ? this.lines : this.maxLine;
      Frame.draw(Sheet.X, Sheet.Y1, rows, cols, '#sheet');
      
      this.contents.forEach((line, i) => {
        [...line].forEach((c, j) => {
          const json = this.cachedGlyphs.get(c);
          if (json) {
            this.renderGlyph(json, i, j, 0);
          }
        }, this);
      }, this);

      if (this.hasMultiGlyph()) {
        $('#selection').show();
        this.renderSelection();
      }
    });
  }
}

function setup() {
  const handler = new FreeStyle();

  $('#selection').hide();
  $('#gen').on('click', () => {
    handler.generateSheet();
  });

  $('#char').on('change', () => handler.multiChar());
  $('#choice').on('change', () => handler.multiChange());

  $('#print').on('click', () => {
    window.print();
  });
}

export {setup}