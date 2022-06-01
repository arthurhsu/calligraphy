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

  // streamSaver.createWriteStream() returns a writable byte stream
  // The WritableStream only accepts Uint8Array chunks
  // (no other typed arrays, arrayBuffers or strings are allowed)
  const fileStream = streamSaver.createWriteStream(
      fileName, { size: payload.byteLength });

  const writer = fileStream.getWriter();
  writer.write(payload);
  writer.close();
}

function SVG(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

function setupCanvasHandlers(tag) {
  const handler = MouseHandler.get(tag);
  $(tag).on('mouseup', handler.mouseup.bind(handler));
  $(tag).on('mousemove', handler.mousemove.bind(handler));
  $(tag).on('mousedown', handler.mousedown.bind(handler));
}

function setupButtonHandlers(tagToggle) {
  const handler = ButtonHandler.get();
  $(tagToggle).click(handler.modeToggle.bind(handler, tagToggle));
}

class Guides {
  constructor(tag, width) {
    this.tag = tag;
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
        .appendTo(this.tag);
  }

  line(x1, y1, x2, y2) {
    $(SVG('line'))
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', 'red')
        .attr('stroke-dasharray', '5,5')
        .appendTo(this.tag);
  }
}

class Glyph {
  static instance = undefined;

  constructor() {
    this.strokes = [];
  }

  static get() {
    if (Glyph.instance == undefined) {
      Glyph.instance = new Glyph();
    }
    return Glyph.instance;
  }

  clear() {
    Glyph.instance = undefined;
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

  getLastStroke() {
    return this.getStroke(this.getNumberOfStrokes() - 1);
  }

  removeStroke(i) {
    this.strokes.splice(i, 1);
  }

  removeLastStroke() {
    this.strokes.pop();
  }
}

class Stroke {
  constructor(tag) {
    this.vertices = [];  // vertices
    this.splines = [];  // splines
    this.tag = tag;  // canvas selector tag
    this.unselectDot();
  }

  addPoint(x, y) {
    // TODO: check if the point existed
    this.vertices.push([x, y]);
  }

  isEmpty() {
    return this.vertices.length <= 1;
  }

  // Draw a dot
  drawDot(x, y) {
    $(SVG('circle'))
      .attr('id', 'c' + this.vertices.length)
      .attr('r', 8)
      .attr('cx', x)
      .attr('cy', y)
      .attr('fill', 'none')
      .attr('stroke', 'red')
      .attr('stroke-width', 3)
      .appendTo(this.tag);
  }

  addPath() {
    let s = SVG('path');
    $(s)
      .attr('id', 's' + this.splines.length)
      .attr('fill', 'none')
      .attr('stroke', 'green')
      .attr('stroke-width', 16)
      .attr('stroke-linecap', 'round')
      .insertBefore('#c0');
    this.splines.push(s);
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
    const node = document.getElementById(`c${this.selected}`);
    node.setAttributeNS(null, 'cx', x);
    node.setAttributeNS(null, 'cy', y);
    this.vertices[this.selected] = [x, y];
    this.updateSplines();
  }

  removeDot() {
    if (this.selected) {
      this.vertices.splice(this.selected, 1);
      document.getElementById(`c${this.selected}`).remove();
      this.updateSplines();
      this.unselectDot();
    }
  }
}

class ButtonHandler {
  static instance = undefined;

  static get() {
    if (ButtonHandler.instance == undefined) {
      ButtonHandler.instance = new ButtonHandler();
    }
    return ButtonHandler.instance;
  }

  modeToggle(tag, e) {
    EditorState.state = (EditorState.state == EditorState.DRAW) ?
        EditorState.TUNE : EditorState.DRAW;
    $(tag).text(EditorState.state == EditorState.DRAW ? 'Draw' : 'Tune');
  }
}

class MouseHandler {
  static instance = undefined;

  static get(tag) {
    if (MouseHandler.instance == undefined) {
      MouseHandler.instance = new MouseHandler(tag);
    }
    return MouseHandler.instance;
  }

  constructor(tag, e) {
    this.tracking = false;
    this.lastX = undefined;
    this.lastY = undefined;
    this.currentStroke = undefined;
    this.tag = tag;
  }

  ensureStroke() {
    if (this.currentStroke === undefined) {
      this.currentStroke = new Stroke(this.tag);
    }
  }

  mouseup(e) {
    if (EditorState.state == EditorState.DRAW) {
      this.drawMouseup(e);
    } else {
      this.tuneMouseup(e);
    }
  }

  drawMouseup(e) {
    if (e.button == 0) {
      this.currentStroke.drawDot(e.offsetX, e.offsetY);
      this.currentStroke.addPoint(e.offsetX, e.offsetY);
    }
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
        this.currentStroke.addPoint(ptX, ptY);
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
    if (EditorState.state == EditorState.DRAW) {
      this.drawMousedown(e);
    } else {
      this.tuneMousedown(e);
    }
  }

  drawMousedown(e) {
    if (e.button == 0) {  // left button
      this.tracking = true;
      this.ensureStroke();
      this.currentStroke.drawDot(e.offsetX, e.offsetY);
      this.currentStroke.addPoint(e.offsetX, e.offsetY);
      this.lastX = e.offsetX;
      this.lastY = e.offsetY;
    }
  }

  tuneMousedown(e) {
    const stroke = Glyph.get().getLastStroke();
    if (e.button == 0) {  // left button
      if (stroke.selectDot(e.clientX, e.clientY)) {
        this.tracking = true;
      }
    } else if (e.button == 1) {  // middle button
      if (stroke.selectDot(e.clientX, e.clientY)) {
        stroke.removeDot();
      }
    }
  }
}

class EditorState {
  static DRAW = 0;  // DRAW stroke
  static TUNE = 1;  // TUNE stroke
  static state = EditorState.DRAW;
}