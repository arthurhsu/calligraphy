// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

import {Glyph} from './modules/glyph.js';
import {Util} from './modules/util.js';

function animateGlyph(text, index, gap, speed, canvas, color) {
  Util.fetchGlyph(text).then(json => {
    if (json !== null && json.glyphs.length >= index) {
      let g = new Glyph();
      g.deserialize(json.glyphs[index]);
      g.animate(canvas, gap, speed, color);
    }
  });
}

export {animateGlyph}