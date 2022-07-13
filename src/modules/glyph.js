// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

import {createSVG} from './svg.js';
import {Stroke} from './stroke.js';

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

  getTags() {
    return this.tags;
  }

  getStroke(i) {
    return this.strokes[i];
  }

  isEmpty() {
    return this.strokes.length == 0;
  }

  removeStroke(i) {
    const index = (i < 0) ? this.strokes.length - 1 : i;
    if (index < 0) return index;
    const stroke =  this.strokes.splice(index, 1)[0];
    stroke.vertexIds.forEach(id => $(`#${id}`).remove());
    stroke.splineIds.forEach(id => $(`#${id}`).remove());
    return index;
  }

  serialize() {
    return {
      'tags': this.tags,
      'strokes': this.strokes.map(s => s.serialize()),
    };
  }

  deserialize(canvas, json) {
    if (!json) return this;
    this.strokes = json.strokes.map((s, i) => Stroke.deserialize(i, canvas, s));
    this.tags = json.tags;
    return this;
  }

  renderStrokes(target, color='blue') {
    this.strokes.forEach((s, i) => {
      s.splines.forEach((p, j) => {
        createSVG('path', {
          'id': `S${i}s${j}`,
          'fill': 'none',
          'stroke': color,
          'stroke-width': 16,
          'stroke-linecap': 'round',
          'd': p.attr('d')
        }).appendTo(target);
      });
    });
  }

  hshift(offset) {
    this.strokes.forEach(s => s.hshift(offset));
  }

  vshift(offset) {
    this.strokes.forEach(s => s.vshift(offset));
  }

  hasTag(tag) {
    return this.tags.indexOf(tag) != -1;
  }

  addTag(tag) {
    if (!this.hasTag(tag)) {
      this.tags.push(tag);
      return this.tags.length - 1;
    }
    return -1;
  }

  removeTag(tag) {
    const index = this.tags.indexOf(tag);
    return index == -1 ? null : this.tags.splice(index, 1)[0];
  }

  zoom(pct) {
    this.strokes.forEach(s => s.zoom(pct));
  }
}

export {Glyph}