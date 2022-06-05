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

function SVG(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

function acquireGlyph() {
  let moveOn = false;
  while (!moveOn) {
    const text = prompt('Input a Kanji to start:');
    if (text && text.length == 1) {
      Glyph.get().load(text);
      moveOn = true;
    }
  }
}

function setupCanvasHandlers(size, main, preview1, preview2, bgImage, target) {
  Canvas.size = size;
  Canvas.main = main;
  Canvas.preview1 = preview1;
  Canvas.preview2 = preview2;
  Canvas.bgImage = bgImage;
  Canvas.target = target;

  Guides.setup(size);
  MouseHandler.get().install();
  $(Canvas.target).text(`${Glyph.get().text} ${Glyph.get().getCode()}`);
}

function setupEditingHandlers(name, undoBtn, confirmBtn, cancelBtn) {
  EditingHandlers.get().install(name, undoBtn, confirmBtn, cancelBtn);
}

function setupFunctionHandlers(loadBtn, exportBtn, newBtn) {
  $(exportBtn).click(() => {
    Glyph.get().export();
  });

  $(loadBtn).click(() => {
    Glyph.get().loadLegacy();
  });

  $(newBtn).click(() => {
    if (!Glyph.get().saved && !confirm('Abandon current glyph?')) return;

    Glyph.clear();
    MouseHandler.get().clear();
    EditingHandlers.get().clear();
    $(Canvas.main).children('path[id^=S]').remove();
    $(Canvas.main).children('circle').remove();
    const image = document.getElementById(Canvas.bgImage.substring(1));
    image.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
    $(Canvas.preview1).empty();
    $(Canvas.preview2).empty();
    acquireGlyph();
    $(Canvas.target).text(`${Glyph.get().text} ${Glyph.get().getCode()}`);
  });
}

class Canvas {
  static size;
  static main;
  static preview1;
  static preview2;
  static bgImage;
  static target;
}

class EditingHandlers {
  static instance = undefined;
  static get() {
    if (EditingHandlers.instance === undefined) {
      EditingHandlers.instance = new EditingHandlers();
    }
    return EditingHandlers.instance;
  }

  constructor() {
    this.radioGroup = undefined;
  }

  clear() {
    $(`input[name=${this.radioGroup}][value='draw']`).prop('checked', true);
  }

  install(name, undoBtn, confirmBtn, cancelBtn) {
    $(`input:radio[name=${name}]`).click(() => {
      const val = $(`input:radio[name=${name}]:checked`).val();
      EditorState.state = val;
    });
    this.radioGroup = name;

    $(undoBtn).click(() => {
      // TODO: a better undo
      Glyph.get().removeLastStroke();
    });

    $(confirmBtn).click(() => {
      Glyph.get().updatePreviews();
    });

    $(cancelBtn).click(() => {
      // TODO: cancel
    });
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
    const command = `M${l} ${l} L${[r, l, r, r, l, r, l, l].join(' ')}`;
    return $(SVG('path'))
        .attr('id', 'rc' + pct)
        .attr('fill', 'none')
        .attr('stroke', 'red')
        .attr('stroke-dasharray', '5,5')
        .attr('d', command)
        .appendTo(Canvas.main);
  }

  line(x1, y1, x2, y2) {
    $(SVG('line'))
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', 'red')
        .attr('stroke-dasharray', '5,5')
        .appendTo(Canvas.main);
  }
}

class Glyph {
  static instance = undefined;

  constructor() {
    this.strokes = [];
    this.text = undefined;
    this.saved = true;
  }

  static get() {
    if (Glyph.instance == undefined) {
      Glyph.instance = new Glyph();
    }
    return Glyph.instance;
  }

  static clear() {
    Glyph.instance = undefined;
  }

  addStroke(s) {
    this.strokes.push(s);
    this.saved = false;
  }

  getNumberOfStrokes() {
    return this.strokes.length;
  }

  getStroke(i) {
    return this.strokes[i];
  }

  getLastStroke() {
    return this.getStroke(this.getNumberOfStrokes() - 1);
  }

  removeStroke(i) {
    this.strokes.splice(i, 1);
  }

  removeLastStroke() {
    this.eraseStroke(this.strokes.pop());
  }

  eraseStroke(stroke) {
    stroke.vertexIds.forEach(id => $(`#${id}`).remove());
    stroke.splineIds.forEach(id => $(`#${id}`).remove());
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

  render(json) {
    const g = json.glyphs[0];
    this.strokes = g.strokes.map((s, i) => Stroke.deserialize(i, s));
    this.updatePreviews();
  }

  load(s) {
    this.text = s;
    return fetch(this.getPath(s)).then(resp => {
      return resp.ok ? resp.json() : Promise.resolve(null);
    }).then(json => {
      if (json !== null) {
        // TODO: solve multi glyph
        this.render(json);
      }
    }, this);
  }

  // Load and render legacy asset
  loadLegacy() {
    const image = document.getElementById(Canvas.bgImage.substring(1));
    image.setAttributeNS(
        'http://www.w3.org/1999/xlink', 'href', this.getLegacyPath());
    $(Canvas.bgImage).attr('width', Canvas.size);
    $(Canvas.bgImage).attr('height', Canvas.size);
  }

  export() {
    // TODO: handle multi-glyph
    const ret = {
      'code': this.getCode(this.text),
      'text': this.text,
      'glyphs': [{'strokes': this.strokes.map(s => s.serialize())}]
    };

    writeFile(`${this.getCode()}.json`, JSON.stringify(ret));
    this.saved = true;
  }

  updatePreviews() {
    $(Canvas.preview1).empty();
    $(Canvas.preview2).empty();
    this.strokes.forEach(s => {
      s.splines.forEach(p => {
        let e = $(SVG('path'))
            .attr('fill', 'none')
            .attr('stroke', 'blue')
            .attr('stroke-width', 16)
            .attr('stroke-linecap', 'round')
            .attr('d', $(p).attr('d'));
        $(Canvas.preview1).append(e.clone());
        $(Canvas.preview2).append(e);
      });
    });
  }
}

class Stroke {
  constructor(id = -1) {
    this.id = (id == -1) ? Glyph.get().getNumberOfStrokes() : id;
    this.vertices = [];  // vertices
    this.vertexIds = [];  // ids for vertices
    this.splines = [];  // splines
    this.splineIds = [];  // ids for splines
    this.unselectDot();
  }

  static deserialize(id, json) {
    const ret = new Stroke(id);
    for (let i = 0; i < json.dots.length; i += 2) {
      ret.drawDot(json.dots[i], json.dots[i + 1]);
    }
    ret.finish();
    return ret;
  }

  serialize() {
    // TODO: fix data2svg.js, data structure changed
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
    $(SVG('circle'))
      .attr('id', id)
      .attr('r', 8)
      .attr('cx', x)
      .attr('cy', y)
      .attr('fill', 'none')
      .attr('stroke', 'red')
      .attr('stroke-width', 3)
      .appendTo(Canvas.main);
    this.vertices.push([x, y]);
    this.vertexIds.push(id);
  }

  addPath() {
    const id = `S${this.id}s${this.splines.length}`;
    let s = SVG('path');
    $(s)
      .attr('id', id)
      .attr('fill', 'none')
      .attr('stroke', 'green')
      .attr('stroke-width', 16)
      .attr('stroke-linecap', 'round')
      .insertBefore('#S0c0');
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
      this.splines[i].setAttributeNS(
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
    node.setAttributeNS(null, 'cx', x);
    node.setAttributeNS(null, 'cy', y);
    this.vertices[this.selected] = [x, y];
    this.updateSplines();
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
}

class MouseHandler {
  static instance = undefined;

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
    if (this.currentStroke === undefined) {
      this.currentStroke = new Stroke();
    }
  }

  mouseup(e) {
    if (e.button != 0) return;

    if (EditorState.state == EditorState.DRAW) {
      this.drawMouseup(e);
    } else {
      this.tuneMouseup(e);
    }
  }

  drawMouseup(e) {
    this.currentStroke.drawDot(e.offsetX, e.offsetY);
    this.tracking = false;
    if (!this.currentStroke.isEmpty()) {
      this.currentStroke.finish();
      Glyph.get().addStroke(this.currentStroke);
      this.currentStroke = undefined;
    }
  }

  tuneMouseup(e) {
    Glyph.get().getLastStroke().unselectDot();
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
    if (this.tracking) {
      // pick points have at least delta of 20pt
      const ptX = e.offsetX;
      const ptY = e.offsetY;
      if (Math.max(Math.abs(ptX - this.lastX), Math.abs(ptY - this.lastY)) > 20) {
        this.currentStroke.drawDot(ptX, ptY);
        this.lastX = ptX;
        this.lastY = ptY;
      }
    }
  }

  tuneMousemove(e) {
    if (this.tracking) {
      Glyph.get().getLastStroke().moveDot(e.clientX, e.clientY);
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
    const stroke = Glyph.get().getLastStroke();
    if (EditorState.state == EditorState.MOVE) {
      if (stroke.selectDot(e.clientX, e.clientY)) {
        this.tracking = true;
      }
    } else if (EditorState.state == EditorState.DELETE) {
      if (stroke.selectDot(e.clientX, e.clientY)) {
        stroke.removeDot();
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