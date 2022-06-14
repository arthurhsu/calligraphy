// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 *
 * Cubic Bezier computation courtesy of
 * http://www.particleincell.com/2012/bezier-splines/
 */

function createSVG(tag, data) {
  let ret = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (let prop in data) {
    ret.setAttributeNS(null, prop, data[prop]);
  }
  return $(ret);
}

function svgBox(id, x1, y1, x2, y2, color, width, dash, appendTo) {
  let props = {
    'fill': 'none',
    'stroke': color,
    'stroke-width': width,
    'd': `M${x1} ${y1} L${[x2, y1, x2, y2, x1, y2, x1, y1].join(' ')}`,
  };
  if (id) {
    props['id'] = id;
  }
  if (dash) {
    props['stroke-dasharray'] = '5,5';
  }
  return createSVG('path', props).appendTo(appendTo);
}

function svgLine(id, x1, y1, x2, y2, color, width, dash, appendTo) {
  let props = {
    'x1': x1,
    'y1': y1,
    'x2': x2,
    'y2': y2,
    'stroke': color,
    'stroke-width': width,
  };
  if (id) {
    props['id'] = id;
  }
  if (dash) {
    props['stroke-dasharray'] = '5,5';
  }
  return createSVG('line', props).appendTo(appendTo);
}

export {createSVG, svgBox, svgLine}