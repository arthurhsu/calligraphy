// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 *
 * Cubic Bezier computation courtesy of
 * http://www.particleincell.com/2012/bezier-splines/
 */

import {createSVG} from './svg.js';
import {Resolver} from './resolver.js';
import {Util} from './util.js';

class Stroke {
  constructor(id) {
    this.id = id;
    this.vertices = [];  // vertices
    this.vertexIds = [];  // ids for vertices
    this.splines = [];  // splines
    this.splineIds = [];  // ids for splines
    this.activated = false;
    this.selected = -1;
    this.resolver = undefined;
  }

  static deserialize(id, json) {
    const ret = new Stroke(id);
    for (let i = 0; i < json.dots.length; i += 2) {
      ret.vertexIds.push(`S${ret.id}c${ret.vertices.length}`);
      ret.vertices.push([json.dots[i], json.dots[i + 1]]);
    }
    return ret;
  }

  serialize() {
    // In multi-glyph environment, only the vertices are reliable.
    // Because splines are not necessarily be on-screen, therefore it is needed
    // to recalculate the splines.
    this.vertices = this.vertices.map(v => {
      return [parseFloat(v[0].toFixed(2)), parseFloat(v[1].toFixed(2))];
    });
    const x = this.vertices.map(dot => dot[0]);
    const y = this.vertices.map(dot => dot[1]);

    const px = this.computeControlPoints(x);
    const py = this.computeControlPoints(y);

    const splines = new Array(this.vertices.length - 1);
    for (let i = 0; i < splines.length; ++i) {
      splines[i] = this.createPath(
          x[i], y[i],
          px.p1[i], py.p1[i],
          px.p2[i], py.p2[i],
          x[i + 1], y[i + 1]);
    }

    return {
      'dots': this.vertices.flat(),
      'splines': splines,
    }
  }

  isEmpty() {
    return this.vertices.length <= 1;
  }

  // Draw a dot
  drawDot(canvas, x, y) {
    const id = `S${this.id}c${this.vertices.length}`;
    createSVG('circle', {
      'id': id,
      'r': 8,
      'cx': x,
      'cy': y,
      'fill': 'none',
      'stroke': 'red',
      'stroke-width': 3,
    }).appendTo(canvas);
    this.vertices.push([x, y]);
    this.vertexIds.push(id);
  }

  addPath(canvas, colorOverride) {
    const color = colorOverride || (this.activated ? 'green' : 'blue');
    const id = `S${this.id}s${this.splines.length}`;
    let s = createSVG('path', {
      'id': id,
      'fill': 'none',
      'stroke': color,
      'stroke-width': 16,
      'stroke-linecap': 'round',
    });
    const dotId = `#S${this.id}c0`;
    if (document.querySelector(dotId)) {
      s.insertBefore(dotId);
    } else {
      s.appendTo(canvas);
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
  finish(canvas, colorOverride) {
    while (this.splines.length < this.vertices.length - 1) {
      this.addPath(canvas, colorOverride);
    }
    this.updateSplines();
  }

  animate(canvas, speed, color) {
    // Add a spline every 100 milliseconds
    this.resolver = new Resolver();
    this.delayDraw(canvas, speed, color);
    return this.resolver.promise;
  }

  updateLastSpline() {
    const i = this.splines.length - 1;
    const x = this.vertices.map(dot => dot[0]);
    const y = this.vertices.map(dot => dot[1]);

    const px = this.computeControlPoints(x);
    const py = this.computeControlPoints(y);

    this.splines[i].get(0).setAttributeNS(
        null,
        'd',
        this.createPath(
            x[i], y[i],
            px.p1[i], py.p1[i],
            px.p2[i], py.p2[i],
            x[i + 1], y[i + 1]));
  }

  delayDraw(canvas, gap, color) {
    if (this.splines.length < this.vertices.length - 1) {
      this.addPath(canvas, color);
      this.updateLastSpline();
      Util.sleep(gap).then(this.delayDraw.bind(this, canvas, gap, color));
    } else {
      if (this.resolver) {
        this.resolver.resolve();
      }
    }
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
      const vertex = document.getElementById(vId);
      if (vertex) vertex.remove();
      const spline = document.getElementById(sId);
      if (spline) spline.remove();
      this.vertices.splice(this.selected, 1);
      this.vertexIds.splice(this.selected, 1);
      this.splines.splice(this.selected, 1);
      this.splineIds.splice(this.selected, 1);
      this.updateSplines();
      this.unselectDot();
    }
  }

  addDot(canvas) {
    if (this.activated == false) return;

    const index = this.vertexIds.length - 1;
    const x = this.vertices[index][0] + 20;
    const y = this.vertices[index][1] + 20;
    this.drawDot(canvas, x, y);
    this.addPath(canvas);
    this.updateSplines();
  }

  activate(canvas) {
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
      }).appendTo(canvas);
    }
    this.splines.forEach(s => {
      s.get(0).setAttributeNS(null, 'stroke', 'green');
    });
    this.activated = true;
  }

  deactivate(canvas) {
    $(canvas).children('circle').remove();
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

  zoom(pct) {
    const transform = (value) => {
      return 256 + (value - 256) * (pct / 100);
    };
    this.vertices.forEach((v, i) => {
      v[0] = transform(v[0]);
      v[1] = transform(v[1]);
      const node = document.getElementById(this.vertexIds[i]);
      if (node) {
        node.setAttributeNS(null, 'cx', v[0]);
        node.setAttributeNS(null, 'cy', v[1]);
      }
    });
    this.updateSplines();
  }

  rotate(deg) {
    this.vertices.forEach((v, i) => {
      const cost = Math.cos(deg * Math.PI / 180);
      const sint = Math.sin(deg * Math.PI / 180);
      const x = v[0];
      const y = v[1];
      v[0] = (x - 256) * cost - (y - 256) * sint + 256;
      v[1] = (x - 256) * sint + (y - 256) * cost + 256;
      console.log(x, y, cost, sint, v[0], v[1]);
      const node = document.getElementById(this.vertexIds[i]);
      if (node) {
        node.setAttributeNS(null, 'cx', v[0]);
        node.setAttributeNS(null, 'cy', v[1]);
      }
    });
    this.updateSplines();
  }
}

export {Stroke};