// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

import {Canvas} from './canvas.js';
import {Glyph} from './glyph.js';
import {MouseHandler} from './mouse_handler.js';
import {StrokeEditor} from './stroke_editor.js';
import {Util} from './util.js'

class GlyphEditor {
  static instance;
  static get() {
    if (GlyphEditor.instance === undefined) {
      GlyphEditor.instance = new GlyphEditor();
    }
    return GlyphEditor.instance;
  }

  static current() {
    return GlyphEditor.get().getCurrentGlyph();
  }

  constructor() {
    this.index = -1;
    this.selectorId = undefined;
    this.batchSelect = undefined;
    this.moveCheckboxId = undefined;
    this.refreshCheckId = undefined;
    this.batchMove = undefined;
    this.text = undefined;
    this.glyphs = [];
    this.shifting = false;
    this.batchShifting = false;
    this.xbase = 256;
    this.ybase = 256;
    this.rendered = new Map();
  }

  install(glyphSelector, moveCheck, addBtn, zoomBtn, hzoomBtn, vzoomBtn,
      hashtagBtn, importBtn, copyBtn, rotateBtn) {
    this.selectorId = glyphSelector;
    this.moveCheckboxId = moveCheck;
    $(glyphSelector).on('change', this.onChange.bind(this));
    $(moveCheck).on('change', this.onToggleMove.bind(this));
    $(addBtn).on('click', () => {
      this.addGlyph();
      this.resetCanvas();
      this.addTag('楷');  // add default tag
    });
    $(zoomBtn).on('click', () => {
      const image = document.getElementById(Canvas.bgImage.substring(1));
      if (!image) return;
      const src = image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (src && src.length) {
        const pct = parseInt(prompt('Zoom percentage?', '100') || '100');
        const shift = (100 - pct) / 2;
        image.style.transform =
            `scale(${pct/100}) translate(${shift}%, ${shift}%)`;
      } else {
        this.zoom(true, true);
      }
    });
    $(hzoomBtn).on('click', () => {
      this.zoom(true, false);
    });
    $(vzoomBtn).on('click', () => {
      this.zoom(false, true);
    });
    $(hashtagBtn).on('click', () => {
      let tag = prompt('Tag name?', '楷');
      if (!tag || tag.trim().length == 0) return;
      if (tag.startsWith('#')) tag = tag.substring(1);
      this.addTag(tag);
    });
    $(importBtn).on('click', () => {
      navigator.clipboard.read().then(items => {
        const item = items[0];
        return item.getType(item.types[0]);
      }).then(blob => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const image = document.getElementById(Canvas.bgImage.substring(1));
          if (!image || !ev.target) return;
          image.setAttributeNS(
              'http://www.w3.org/1999/xlink', 'href', ev.target.result);
        };
        reader.readAsDataURL(blob);
      });
    });
    $(copyBtn).on('click', () => {
      if (this.getCurrentGlyph().strokes.length > 0) {
        alert('Must not copy while existing glyph is not empty');
        return;
      }
      this.glyphs = [];  // Clear existing glyph
      $('#ht0').remove();  // Remove default tag
      $(this.selectorId).empty();  // Clear glyph selector
      const text = prompt('Input a Kanji to copy from:');
      if (text && text.length == 1) {
        this.clone(text);
      }
    });
    $(rotateBtn).on('click', () => {
      this.rotate();
    });
  }

  highlight() {
    this.getCurrentGlyph().deselectAll(Canvas.main);
    this.getCurrentGlyph().highlight(this.getSelects());
  }

  installBatch(
      refresh, batch, moveBtn, zoomBtn, hzoomBtn, vzoomBtn, rotateBtn) {
    this.refreshCheckId = refresh;
    $(refresh).on('change', () => {
      $(batch).empty();
      if ($(refresh).prop('checked')) {
        const num = this.getCurrentGlyph().getNumberOfStrokes();
        for (let i = 0; i < num; i++) {
          $(batch).append(`<option value="${i}">S${i}</option>`);
        }
      } else {
        $(moveBtn).prop('checked', false);
        this.batchShifting = false;
      }
      $(batch).multipleSelect('refresh');
      this.highlight();
    });
    
    $(batch).on('change', () => {
      this.highlight();
    });

    this.batchMove = moveBtn;
    this.batchSelect = batch;
    $(moveBtn).on('change', this.onToggleBatchMove.bind(this));
    $(zoomBtn).on('click', () => {
      if ($(refresh).prop('checked')) {
        this.zoom(true, true);
      }
    });
    $(hzoomBtn).on('click', () => {
      if ($(refresh).prop('checked')) {
        this.zoom(true, false);
      }
    });
    $(vzoomBtn).on('click', () => {
      if ($(refresh).prop('checked')) {
        this.zoom(false, true);
      }
    });
    $(rotateBtn).on('click', () => {
      if ($(refresh).prop('checked')) {
        this.rotate();
      }
    });
  }

  getSelects() {
    if ($(this.refreshCheckId).prop('checked')) {
      return $(this.batchSelect)
          .multipleSelect('getSelects')
          .map(e => parseInt(e));
    }
    return [];
  }

  getCurrentGlyph() {
    if (this.index == -1) {
      this.addGlyph();
    }
    return this.glyphs[this.index];
  }

  load(text) {
    this.text = text;
    $(this.selectorId).empty();
    $(Canvas.target).text(`${this.text} ${Util.getCode(this.text)}`);
    return this.clone(text);
  }

  // Clone assumes this.glyph == []
  clone(text) {
    return Util.fetchGlyph(text).then(json => {
      if (json !== null) {
        json.glyphs.forEach((g, i) => {
          this.addGlyph();
          this.glyphs[i].deserialize(g);
        }, this);
        this.glyphs[0].renderStrokes(Canvas.main);
        $(`${this.selectorId} option:eq(0)`).prop('selected', true);
        this.index = 0;
        this.rendered[this.index] = true;
        StrokeEditor.get().inflate(this.glyphs[0]);
        this.glyphs[0].getTags().forEach((t, i) => this.renderTag(i, t), this);
        this.updatePreviews();
      } else {
        this.addTag('楷');
      }
    });
  }

  // Load and render legacy asset
  loadLegacy() {
    if (this.index == -1) {
      this.addGlyph();
    }

    const image = document.getElementById(Canvas.bgImage.substring(1));
    if (!image) return;
    image.setAttributeNS(
        'http://www.w3.org/1999/xlink', 'href', Util.getLegacyPath(this.text));
    $(Canvas.bgImage).attr('width', Canvas.size);
    $(Canvas.bgImage).attr('height', Canvas.size);
  }

  clearBackground() {
    const image = document.getElementById(Canvas.bgImage.substring(1));
    if (!image) return;
    image.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
  }

  export() {
    const ret = {
      'code': Util.getCode(this.text),
      'text': this.text,
      'glyphs': this.glyphs.map(g => g.serialize()),
    };

    Util.writeFile(`${ret['code']}.json`, JSON.stringify(ret));
  }

  resetCanvas() {
    MouseHandler.get().clear();
    StrokeEditor.get().clear();
    $(Canvas.main).children('path[id^=S]').remove();
    $(Canvas.main).children('circle').remove();
    this.clearBackground();
    $(Canvas.preview1).empty();
    $(Canvas.preview2).empty();
    $(Canvas.tagContainer).empty();
  }

  render() {
    const reattach = this.rendered[this.index] || false;
    this.getCurrentGlyph().renderStrokes(Canvas.main, reattach);
    StrokeEditor.get().inflate(this.getCurrentGlyph());
    this.rendered[this.index] = true;
    this.updatePreviews();
  }

  updatePreviews() {
    $(Canvas.preview1).empty();
    $(Canvas.preview2).empty();
    this.getCurrentGlyph().renderStrokes(Canvas.preview1, true);
    this.getCurrentGlyph().renderStrokes(Canvas.preview2, true);
  }

  onChange() {
    const newIndex = parseInt($(this.selectorId).val());
    if (newIndex != this.index) {
      this.index = newIndex;
      this.resetCanvas();
      this.render();
      this.getCurrentGlyph().getTags().forEach(
          (t, i) => this.renderTag(i, t), this);
    }
  }

  onToggleMove() {
    this.shifting = $(this.moveCheckboxId).prop('checked');
  }

  onToggleBatchMove() {
    this.batchShifting = $(this.batchMove).prop('checked');
  }

  hshift(e) {
    if (this.shifting || this.batchShifting) {
      const offset = e.target.valueAsNumber - this.xbase;
      this.xbase = e.target.valueAsNumber;
      const strokeSet = this.batchShifting ? this.getSelects() : undefined;
      this.getCurrentGlyph().hshift(offset, strokeSet);
      this.updatePreviews();
    }
  }

  vshift(e) {
    if (this.shifting || this.batchShifting) {
      const offset = e.target.valueAsNumber - this.ybase;
      this.ybase = e.target.valueAsNumber;
      const strokeSet = this.batchShifting ? this.getSelects() : undefined;
      this.getCurrentGlyph().vshift(offset, strokeSet);
      this.updatePreviews();
    }
  }

  zoom(h, v) {
    if (this.getCurrentGlyph().getNumberOfStrokes()) {
      const lit = (h && v) ? 'Zoom' : (h ? 'HZoom' : 'VZoom');
      const pct = parseInt(prompt(`${lit} percentage?`, '100') || '100');
      const batchSet = this.getSelects();
      const strokeSet = (batchSet && batchSet.length) ? batchSet : undefined;
      this.getCurrentGlyph().zoom(pct, h, v, strokeSet);
      this.updatePreviews();
    }
  }

  rotate() {
    if (this.getCurrentGlyph().getNumberOfStrokes()) {
      const tag = prompt('Rotate CW degrees?');
      if (!tag || tag.trim().length == 0) return;
      try {
        const deg = parseInt(tag, 10);
        if (deg) {
          const batchSet = this.getSelects();
          const strokeSet = (batchSet && batchSet.length) ? batchSet : undefined;
          this.getCurrentGlyph().rotate(deg, strokeSet);
          this.updatePreviews();
        }
      } catch(e) {
        console.error(e);
      }
    }
  }

  addGlyph() {
    this.index = this.glyphs.length;
    this.glyphs.push(new Glyph());
    $(this.selectorId).append(
        `<option value=${this.index} selected='true'>G${this.index}</option>`);
  }

  removeLastStroke() {
    const index = this.getCurrentGlyph().removeStroke(-1);
    if (index >= 0) {
      this.updatePreviews();
    }
    return index;
  }

  removeStroke(index) {
    return this.getCurrentGlyph().removeStroke(index);
  }

  addTag(tag) {
    if (!this.getCurrentGlyph().hasTag(tag)) {
      const index = this.getCurrentGlyph().addTag(tag);
      if (index != -1) {
        this.renderTag(index, tag);
      }
    }
  }

  renderTag(index, tag) {
    const tagId = `ht${index}`;
    $(Canvas.tagContainer).append(`<p id="${tagId}" class="tag">${tag}</p>`);
    $('.tag').on('click', this.removeTag.bind(this));
  }

  removeTag(e) {
    this.getCurrentGlyph().removeTag(e.target.textContent);
    $(`#${e.target.id}`).remove();
  }
}

export {GlyphEditor}