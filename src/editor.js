// @ts-check
/**
 * @license
 * Copyright 2015 Arthur Hsu. Distributed under Creative Commons License.
 *
 * Cubic Bezier computation courtesy of
 * http://www.particleincell.com/2012/bezier-splines/
 */

function writeFile(fileName, contents) {
  const streamSaver = window.streamSaver;
  const payload = new TextEncoder().encode(contents);
  const fileStream = streamSaver.createWriteStream(
      fileName, { size: payload.byteLength });
  const writer = fileStream.getWriter();
  writer.write(payload);
  writer.close();
}

function createSVG(tag, data) {
  let ret = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (let prop in data) {
    ret.setAttributeNS(null, prop, data[prop]);
  }
  return $(ret);
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
      this.getCurrentGlyph().addTag('楷');  // add default tag
    });
    $(zoomBtn).on('click', () => {
      const image = document.getElementById(Canvas.bgImage.substring(1));
      const src = image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (src.length) {
        const pct = parseInt(prompt('Zoom percentage?', '100'));
        const shift = (100 - pct) / 2;
        image.style.transform =
            `scale(${pct/100}) translate(${shift}%, ${shift}%)`;
      }
    });
    $(hashtagBtn).on('click', () => {
      let tag = prompt('Tag name?', '楷');
      if (tag.startsWith('#')) tag = tag.substring(1);
      GlyphEditor.current().addTag(tag);
    });
    $(importBtn).on('click', () => {
      navigator.clipboard.read().then(items => {
        const item = items[0];
        return item.getType(item.types[0]);
      }).then(blob => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          document.getElementById(Canvas.bgImage.substring(1)).setAttributeNS(
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

  getCode() {
    return this.text.charCodeAt(0).toString(16).toUpperCase();
  }

  getPath() {
    const code = this.getCode();
    return `/data/${code.slice(0, 1)}/${code}.json`;
  }

  getLegacyPath() {
    const code = this.getCode();
    return `/assets/${code.slice(0, 1)}/${code}.png`;
  }

  load(text) {
    this.text = text;
    $(this.selectorId).empty();
    return fetch(this.getPath()).then(resp => {
      return resp.ok ? resp.json() : Promise.resolve(null);
    }).then(json => {
      if (json !== null) {
        json.glyphs.forEach((g, i) => {
          this.addGlyph();
          this.glyphs[i].deserialize(g);
        }, this);
        $(`${this.selectorId} option:eq(0)`).prop('selected', true);
        this.index = 0;
        StrokeEditor.get().inflate(this.glyphs[0]);
        this.glyphs[0].updatePreviews();
      } else {
        this.getCurrentGlyph().addTag('楷');
      }
      $(Canvas.target).text(`${this.text} ${this.getCode()}`);
    }, this);
  }

  // Load and render legacy asset
  loadLegacy() {
    if (this.index == -1) {
      this.addGlyph();
    }

    const image = document.getElementById(Canvas.bgImage.substring(1));
    image.setAttributeNS(
        'http://www.w3.org/1999/xlink', 'href', this.getLegacyPath());
    $(Canvas.bgImage).attr('width', Canvas.size);
    $(Canvas.bgImage).attr('height', Canvas.size);
  }

  clearBackground() {
    const image = document.getElementById(Canvas.bgImage.substring(1));
    image.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
  }

  export() {
    const ret = {
      'code': this.getCode(),
      'text': this.text,
      'glyphs': this.glyphs.map(g => g.serialize()),
    };

    writeFile(`${this.getCode()}.json`, JSON.stringify(ret));
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

  onChange() {
    const newIndex = $(this.selectorId).val();
    if (newIndex != this.index) {
      this.index = newIndex;
      this.resetCanvas();
      this.getCurrentGlyph().render();
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
    }
  }

  vshift(e) {
    if (this.shifting) {
      const offset = e.target.valueAsNumber - this.ybase;
      this.ybase = e.target.valueAsNumber;
      this.getCurrentGlyph().vshift(offset);
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
      this.getCurrentGlyph().updatePreviews();
    }
    return index;
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
    const ret = new Stroke(id);
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
    createSVG('path', {
      'id': `rc${pct}`,
      'fill': 'none',
      'stroke': 'red',
      'stroke-dasharray': '5,5',
      'd': `M${l} ${l} L${[r, l, r, r, l, r, l, l].join(' ')}`,
    }).appendTo(Canvas.main);
  }

  line(x1, y1, x2, y2) {
    createSVG('line', {
      'x1': x1,
      'y1': y1,
      'x2': x2,
      'y2': y2,
      'stroke': 'red',
      'stroke-dasharray': '5,5',
    }).appendTo(Canvas.main);
  }
}

class Glyph {
  constructor() {
    this.strokes = [];
    this.tags = [];
  }

  addStroke(s) {
    this.strokes.push(s);
  }

  getNumberOfStrokes() {
    return this.strokes.length;
  }

  getStroke(i) {
    return this.strokes[i];
  }

  removeStroke(i) {
    const index = (i < 0) ? this.strokes.length - 1 : i;
    if (index < 0) return index;
    const stroke =  this.strokes.splice(index, 1)[0];
    stroke.vertexIds.forEach(id => $(`#${id}`).remove());
    stroke.splineIds.forEach(id => $(`#${id}`).remove());
    return index;
  }

  getNewStroke() {
    return StrokeEditor.get().getNewStroke(this.strokes.length);
  }

  render() {
    this.renderStrokes(Canvas.main);
    this.updatePreviews();
  }

  serialize() {
    return {
      'tags': this.tags,
      'strokes': this.strokes.map(s => s.serialize()),
    };
  }

  deserialize(json) {
    this.strokes = json.strokes.map((s, i) => Stroke.deserialize(i, s));
    json.tags.forEach(t => this.addTag(t));
  }

  renderStrokes(target) {
    this.strokes.forEach((s, i) => {
      s.splines.forEach((p, j) => {
        createSVG('path', {
          'id': `S${i}s${j}`,
          'fill': 'none',
          'stroke': 'blue',
          'stroke-width': 16,
          'stroke-linecap': 'round',
          'd': p.attr('d')
        }).appendTo(target);
      });
    });
  }

  updatePreviews() {
    $(Canvas.preview1).empty();
    $(Canvas.preview2).empty();
    this.renderStrokes(Canvas.preview1);
    this.renderStrokes(Canvas.preview2);
  }

  hshift(offset) {
    this.strokes.forEach(s => s.hshift(offset));
    this.updatePreviews();
  }

  vshift(offset) {
    this.strokes.forEach(s => s.vshift(offset));
    this.updatePreviews();
  }

  addTag(tag) {
    if (this.tags.indexOf(tag) == -1) {
      const tagId = `ht${this.tags.length}`;
      $(Canvas.tagContainer).append(`<p id="${tagId}" class="tag">${tag}</p>`);
      this.tags.push(tag);
      $('.tag').on('click', this.removeTag.bind(this));
    }
  }

  removeTag(e) {
    const index = this.tags.indexOf(e.target.textContent);
    this.tags.splice(index, 1);
    $(`#${e.target.id}`).remove();
  }
}

class Stroke {
  constructor(id) {
    this.id = id;
    this.vertices = [];  // vertices
    this.vertexIds = [];  // ids for vertices
    this.splines = [];  // splines
    this.splineIds = [];  // ids for splines
    this.activated = false;
    this.selected = -1;
  }

  static deserialize(id, json) {
    const ret = new Stroke(id);
    for (let i = 0; i < json.dots.length; i += 2) {
      ret.vertexIds.push(`S${ret.id}c${ret.vertices.length}`);
      ret.vertices.push([json.dots[i], json.dots[i + 1]]);
    }
    ret.finish();
    return ret;
  }

  serialize() {
    return {
      'dots': this.vertices.flat(),
      'splines': this.splineIds.map(id => $(`#${id}`).attr('d'))
    }
  }

  isEmpty() {
    return this.vertices.length <= 1;
  }

  // Draw a dot
  drawDot(x, y) {
    const id = `S${this.id}c${this.vertices.length}`;
    createSVG('circle', {
      'id': id,
      'r': 8,
      'cx': x,
      'cy': y,
      'fill': 'none',
      'stroke': 'red',
      'stroke-width': 3,
    }).appendTo(Canvas.main);
    this.vertices.push([x, y]);
    this.vertexIds.push(id);
  }

  addPath() {
    const id = `S${this.id}s${this.splines.length}`;
    let s = createSVG('path', {
      'id': id,
      'fill': 'none',
      'stroke': this.activated ? 'green' : 'blue',
      'stroke-width': 16,
      'stroke-linecap': 'round',
    });
    const dotId = `#S${this.id}c0`;
    if (document.querySelector(dotId)) {
      s.insertBefore(dotId);
    } else {
      s.appendTo(Canvas.main);
    }
    this.splines.push(s);
    this.splineIds.push(id);
  }

  // Compute control points
  computeControlPoints(K) {
    const n = K.length - 1;
    let p1 = new Array(n);
    let p2 = new Array(n);
    let a = new Array(n);
    let b = new Array(n);
    let c = new Array(n);
    let r = new Array(n);

    // left most segment
    a[0] = 0;
    b[0] = 2;
    c[0] = 1;
    r[0] = K[0] + 2 * K[1];

    // internal segments
    for (let i = 1; i < n - 1; i++)	{
      a[i] = 1;
      b[i] = 4;
      c[i] = 1;
      r[i] = 4 * K[i] + 2 * K[i + 1];
    }

    // right segment
    a[n - 1] = 2;
    b[n - 1] = 7;
    c[n - 1] = 0;
    r[n - 1] = 8 * K[n - 1] + K[n];

    // solves Ax=b with the Thomas algorithm (from Wikipedia)
    for (let i = 1; i < n; i++) {
      const m = a[i] / b[i - 1];
      b[i] = b[i] - m * c[i - 1];
      r[i] = r[i] - m * r[i - 1];
    }

    p1[n - 1] = r[n - 1] / b[n - 1];
    for (let i = n - 2; i >= 0; --i) {
      p1[i] = (r[i] - c[i] * p1[i + 1]) / b[i];
    }

    // we have p1, now compute p2
    for (let i = 0; i < n - 1; i++) {
      p2[i] = 2 * K[i + 1] - p1[i + 1];
    }
    p2[n - 1] = 0.5 * (K[n] + p1[n - 1]);
    return {p1: p1, p2: p2};
  }

  // Creates path string for SVG cubic path element
  createPath(x1, y1, px1, py1, px2, py2, x2, y2) {
    return `M ${x1} ${y1} C ` +
        [
          px1.toFixed(2), py1.toFixed(2),
          px2.toFixed(2), py2.toFixed(2),
          x2, y2
        ].join(' ');
  }

  // Update splines
  updateSplines() {
    const x = this.vertices.map(dot => dot[0]);
    const y = this.vertices.map(dot => dot[1]);

    const px = this.computeControlPoints(x);
    const py = this.computeControlPoints(y);

    for (let i = 0; i < this.vertices.length - 1; ++i) {
      this.splines[i].get(0).setAttributeNS(
          null,
          'd',
          this.createPath(
              x[i], y[i],
              px.p1[i], py.p1[i],
              px.p2[i], py.p2[i],
              x[i + 1], y[i + 1]));
    }
  }

  // Drawing done, finish the splines
  finish() {
    while (this.splines.length < this.vertices.length - 1) {
      this.addPath();
    }
    this.updateSplines();
  }

  // Select a dot on stroke
  selectDot(x, y) {
    const v = this.vertices;
    for (let i = 0; i < v.length; ++i) {
      if (x < v[i][0] + 16 && x > v[i][0] - 16 &&
          y < v[i][1] + 16 && y > v[i][1] - 16) {
        this.selected = i;
        return true;
      }
    }
    return false;
  }

  unselectDot() {
    this.selected = -1;
  }

  moveDot(x, y) {
    const node = document.getElementById(this.vertexIds[this.selected]);
    if (node) {
      node.setAttributeNS(null, 'cx', x);
      node.setAttributeNS(null, 'cy', y);
      this.vertices[this.selected] = [x, y];
      this.updateSplines();
    }
  }

  removeDot() {
    if (this.selected && this.selected != this.vertices.length - 1) {
      const vId = this.vertexIds[this.selected];
      const sId = this.splineIds[this.selected];
      document.getElementById(vId).remove();
      document.getElementById(sId).remove();
      this.vertices.splice(this.selected, 1);
      this.vertexIds.splice(this.selected, 1);
      this.splines.splice(this.selected, 1);
      this.splineIds.splice(this.selected, 1);
      this.updateSplines();
      this.unselectDot();
    }
  }

  activate() {
    if (this.activated == true) return;

    for (let i = 0; i < this.vertexIds.length; ++i) {
      createSVG('circle', {
        'id': this.vertexIds[i],
        'r': 8,
        'cx': this.vertices[i][0],
        'cy': this.vertices[i][1],
        'fill': 'none',
        'stroke': 'red',
        'stroke-width': 3,
      }).appendTo(Canvas.main);
    }
    this.splines.forEach(s => {
      s.get(0).setAttributeNS(null, 'stroke', 'green');
    });
    this.activated = true;
  }

  deactivate() {
    $(Canvas.main).children('circle').remove();
    this.splines.forEach(s => {
      s.get(0).setAttributeNS(null, 'stroke', 'blue');
    });
    this.activated = false;
  }

  hshift(offset) {
    this.vertices.forEach((v, i) => {
      const node = document.getElementById(this.vertexIds[i]);
      v[0] += offset;
      if (node) {
        node.setAttributeNS(null, 'cx', v[0]);
      }
    });
    this.updateSplines();
  }

  vshift(offset) {
    this.vertices.forEach((v, i) => {
      const node = document.getElementById(this.vertexIds[i]);
      v[1] += offset;
      if (node) {
        node.setAttributeNS(null, 'cy', v[1]);
      }
    });
    this.updateSplines();
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
    this.currentStroke = GlyphEditor.current().getNewStroke();
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
    GlyphEditor.current().updatePreviews();
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
        GlyphEditor.current().updatePreviews();
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