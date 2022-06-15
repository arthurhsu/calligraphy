// @ts-check
/**
 * @license
 * Copyright 2015 Arthur Hsu. Distributed under Creative Commons License.
 *
 * Cubic Bezier computation courtesy of
 * http://www.particleincell.com/2012/bezier-splines/
 */

import {createSVG, svgBox, svgLine} from './modules/svg.js';
import {Glyph} from './modules/glyph.js';
import {Stroke} from './modules/stroke.js';
import {Util} from './modules/util.js';

function writeFile(fileName, contents) {
  const streamSaver = window.streamSaver;
  const payload = new TextEncoder().encode(contents);
  const fileStream = streamSaver.createWriteStream(
      fileName, { size: payload.byteLength });
  const writer = fileStream.getWriter();
  writer.write(payload);
  writer.close();
}

function acquireGlyph() {
  let moveOn = false;
  while (!moveOn) {
    const text = prompt('Input a Kanji to start:');
    if (text && text.length == 1) {
      GlyphEditor.get().load(text);
      moveOn = true;
    }
  }
}

function setupCanvasHandlers(
    size, main, preview1, preview2, bgImage, target, tagContainer) {
  Canvas.size = size;
  Canvas.main = main;
  Canvas.preview1 = preview1;
  Canvas.preview2 = preview2;
  Canvas.bgImage = bgImage;
  Canvas.target = target;
  Canvas.tagContainer = tagContainer;

  Guides.setup(size);
  MouseHandler.get().install();
}

function setupGlyphHandlers(
    glyphSelector, moveCheck, addBtn, zoomBtn, hashtagBtn, importBtn) {
  GlyphEditor.get().install(
      glyphSelector, moveCheck, addBtn, zoomBtn, hashtagBtn, importBtn);
}

function setupStrokeHandlers(strokeSelector, editingRadio, undoBtn) {
  StrokeEditor.get().install(strokeSelector, editingRadio, undoBtn);
}

function setupWordHandlers(loadBtn, exportBtn, newBtn, xSlider, ySlider) {
  $(exportBtn).on('click', () => {
    GlyphEditor.get().export();
  });

  $(loadBtn).on('change', () => {
    if ($(loadBtn).prop('checked')) {
      GlyphEditor.get().loadLegacy();
    } else {
      GlyphEditor.get().clearBackground();
    }
  });

  $(newBtn).on('click', () => {
    GlyphEditor.get().clear();
    acquireGlyph();
  });

  $(xSlider).on('change', e => {
    GlyphEditor.get().hshift(e);
  });

  $(ySlider).on('change', e => {
    GlyphEditor.get().vshift(e);
  });
}

class Canvas {
  static size;
  static main;
  static preview1;
  static preview2;
  static bgImage;
  static target;
  static tagContainer;
}

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
    this.moveCheckboxId = undefined;
    this.text = undefined;
    this.glyphs = [];
    this.shifting = false;
    this.xbase = 256;
    this.ybase = 256;
  }

  install(glyphSelector, moveCheck, addBtn, zoomBtn, hashtagBtn, importBtn) {
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
        const pct = parseInt(prompt('Zoom percentage?', '100'));
        const shift = (100 - pct) / 2;
        image.style.transform =
            `scale(${pct/100}) translate(${shift}%, ${shift}%)`;
      }
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
          if (!image) return;
          image.setAttributeNS(
              'http://www.w3.org/1999/xlink', 'href', ev.target.result);
        };
        reader.readAsDataURL(blob);
      });
    });
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
    return Util.fetchGlyph(this.text).then(json => {
      if (json !== null) {
        json.glyphs.forEach((g, i) => {
          this.addGlyph();
          this.glyphs[i].deserialize(Canvas.main, g);
        }, this);
        $(`${this.selectorId} option:eq(0)`).prop('selected', true);
        this.index = 0;
        StrokeEditor.get().inflate(this.glyphs[0]);
        this.glyphs[0].getTags().forEach((t, i) => this.renderTag(i, t), this);
        this.updatePreviews();
      } else {
        this.addTag('楷');
      }
      $(Canvas.target).text(`${this.text} ${Util.getCode(this.text)}`);
    }, this);
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

    writeFile(`${ret['code']}.json`, JSON.stringify(ret));
  }

  clear() {
    // TODO: implement dirty bits
    this.index = -1;
    this.glyphs = [];
    this.resetCanvas();
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
    this.getCurrentGlyph().renderStrokes(Canvas.main);
    this.updatePreviews();
  }

  updatePreviews() {
    $(Canvas.preview1).empty();
    $(Canvas.preview2).empty();
    this.getCurrentGlyph().renderStrokes(Canvas.preview1);
    this.getCurrentGlyph().renderStrokes(Canvas.preview2);
  }

  onChange() {
    const newIndex = $(this.selectorId).val();
    if (newIndex != this.index) {
      this.index = newIndex;
      this.resetCanvas();
      this.render();
    }
  }

  onToggleMove() {
    this.shifting = $(this.moveCheckboxId).prop('checked');
  }

  hshift(e) {
    if (this.shifting) {
      const offset = e.target.valueAsNumber - this.xbase;
      this.xbase = e.target.valueAsNumber;
      this.getCurrentGlyph().hshift(offset);
      this.updatePreviews();
    }
  }

  vshift(e) {
    if (this.shifting) {
      const offset = e.target.valueAsNumber - this.ybase;
      this.ybase = e.target.valueAsNumber;
      this.getCurrentGlyph().vshift(offset);
      this.updatePreviews();
    }
  }

  addGlyph() {
    this.index = this.glyphs.length;
    this.glyphs.push(new Glyph());
    $(this.selectorId).append(
        `<option value=${this.index}>G${this.index}</option>`);
  }

  removeLastStroke() {
    const index = this.getCurrentGlyph().removeStroke(-1);
    if (index >= 0) {
      this.updatePreviews();
    }
    return index;
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
  }

  install(strokeSelector, editingRadio, undoBtn) {
    this.strokeSelector = strokeSelector;
    $(strokeSelector).on('change', this.onChange.bind(this));

    $(`input:radio[name=${editingRadio}]`).on('click', () => {
      const val = $(`input:radio[name=${editingRadio}]:checked`).val();
      EditorState.state = val;
    });
    this.radioGroup = editingRadio;

    $(undoBtn).on('click', this.undo.bind(this));
  }

  onChange() {
    if (this.currentStroke !== undefined) {
      this.currentStroke.deactivate();
    }

    this.currentStroke =
        GlyphEditor.current().getStroke($(this.strokeSelector).val());
    this.currentStroke.activate();
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

  inflate(glyph) {
    // The glyph is just loaded, inflate the stroke info
    for (let i = 0; i < glyph.getNumberOfStrokes(); ++i) {
      $(this.strokeSelector).append(`<option value=${i}>S${i}</option>`);
    }
    $(this.strokeSelector).val(glyph.getNumberOfStrokes() - 1);
  }

  getNewStroke(id) {
    $(this.strokeSelector).append(`<option value=${id}>S${id}</option>`);
    $(this.strokeSelector).val(id);
    const ret = new Stroke(id, Canvas.main);
    this.currentStroke = ret;
    return ret;
  }
}

class Guides {
  static setup(width) {
    return new Guides(width);
  }

  constructor(width) {
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
    svgBox(`rc${pct}`, l, l, r, r, 'red', 1, true, Canvas.main);
  }

  line(x1, y1, x2, y2) {
    svgLine(null, x1, y1, x2, y2, 'red', 1, true, Canvas.main);
  }
}

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
      this.currentStroke.deactivate();
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
    this.currentStroke.drawDot(e.offsetX, e.offsetY);
    this.tracking = false;
    if (!this.currentStroke.isEmpty()) {
      this.currentStroke.finish();
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
        this.currentStroke.drawDot(ptX, ptY);
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
    this.currentStroke.drawDot(e.offsetX, e.offsetY);
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

class EditorState {
  static DRAW = 'draw';
  static MOVE = 'move';
  static DELETE = 'delete';
  static state = EditorState.DRAW;
}

export {acquireGlyph,
        setupCanvasHandlers,
        setupGlyphHandlers,
        setupStrokeHandlers,
        setupWordHandlers}