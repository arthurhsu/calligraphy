/**
 * @license
 * Copyright 2015 Arthur Hsu. Distributed under Creative Commons License.
 *
 * Cubic Bezier computation courtesy of
 * http://www.particleincell.com/2012/bezier-splines/ 
 */
(function() {


var W = 512;  // width of SVG canvas
var V = [];  // vertices
var S = [];  // splines

function SVG(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

// Draw a dot
function drawDot(x, y) {
  $(SVG('circle'))
    .attr('id', 'c' + V.length)
    .attr('r', 8)
    .attr('cx', x)
    .attr('cy', y)
    .attr('fill', 'none')
    .attr('stroke', 'red')
    .attr('stroke-width', 1)
    .appendTo('#pad');
}

// Creates path string for SVG cubic path element
function path(x1, y1, px1, py1, px2, py2, x2, y2) {
  return 'M ' + x1 + ' ' + y1 + ' C ' + 
      [px1.toFixed(2), py1.toFixed(2), px2.toFixed(2), py2.toFixed(2), x2, y2].join(' ');
}

// Update splines
function updateSplines() {
  var x = V.map(function(dot) {
    return dot[0];
  });
  var y = V.map(function(dot) {
    return dot[1];
  });

  px = computeControlPoints(x);
  py = computeControlPoints(y);

  for (i = 0; i < V.length - 1; ++i) {
    S[i].setAttributeNS(null, 'd',
        path(x[i], y[i], px.p1[i], py.p1[i], px.p2[i], py.p2[i], x[i+1], y[i+1]));
  }
}

// Compute control points
function computeControlPoints(K) {
  var n = K.length - 1;
  var p1 = new Array(n);
  var p2 = new Array(n);
  var a = new Array(n);
  var b = new Array(n);
  var c = new Array(n);
  var r = new Array(n);

  // left most segment
	a[0] = 0;
	b[0] = 2;
	c[0] = 1;
	r[0] = K[0]+2*K[1];
	
	// internal segments
	for (var i = 1; i < n - 1; i++)	{
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
	for (var i = 1; i < n; i++) {
		var m = a[i] / b[i - 1];
		b[i] = b[i] - m * c[i - 1];
		r[i] = r[i] - m * r[i - 1];
	}
  
  p1[n - 1] = r[n - 1] / b[n - 1];
	for (var i = n - 2; i >= 0; --i) {
		p1[i] = (r[i] - c[i] * p1[i + 1]) / b[i];
  }
		
	// we have p1, now compute p2
	for (var i = 0; i < n - 1; i++) {
		p2[i] = 2 * K[i + 1] - p1[i + 1];
  }
	p2[n - 1] = 0.5 * (K[n] + p1[n - 1]);
	return {p1: p1, p2: p2};
}

function addPath() {
  var s = SVG('path');
  $(s)
    .attr('id', 's' + S.length)
    .attr('fill', 'none')
    .attr('stroke', 'green')
    .attr('stroke-width', 16)
    .attr('stroke-linecap', 'round')
    .insertBefore('#c0');
  S.push(s);
}

// mousedown event handler
function mdHandler(e) {
  if (e.button == 0) {  // left button
    drawDot(e.offsetX, e.offsetY);
    V.push([e.offsetX, e.offsetY]);
    if (V.length > 1) {
      while (S.length < V.length - 1) {
        addPath();
      }
      updateSplines();
    }
  }
}

// Draw box for percentile
function guideBox(pct) {
  var l = W * (100 - pct) / 200;
  var r = W - l;
  var command = 'M' + l + ' ' + l + ' L' + [r, l, r, r, l, r, l, l].join(' ');
  return $(SVG('path'))
      .attr('id', 'rc' + pct)
      .attr('fill', 'none')
      .attr('stroke', 'red')
      .attr('stroke-dasharray', '5,5')
      .attr('d', command)
      .appendTo('#pad');
}

function guideLine(x1, y1, x2, y2) {
  $(SVG('line'))
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2)
      .attr('stroke', 'red')
      .attr('stroke-dasharray', '5,5')
      .appendTo('#pad');
}

function setUpGuides() {
  guideBox(90);
  guideBox(80);
  guideBox(75);
  guideBox(50);
  guideLine(0, W / 2, W, W / 2);
  guideLine(W / 2, 0, W / 2, W);
  guideLine(0, 0, W, W);
  guideLine(W, 0, 0, W);
}

// Load asset from github
function loadAsset() {
  var code = $('#char').val().charCodeAt(0).toString(16).toUpperCase();
  var path = '../../assets/' + code.slice(0, 1) + '/' + code + '.png';
  var image = document.getElementById('bgImage');
  image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', path);
  image = $('#bgImage');
  image.attr('x', $('#px').val());
  image.attr('y', $('#py').val());
  image.attr('width', $('#width').val());
  image.attr('height', $('#height').val());
}

// Delete current stroke
function deleteStroke() {
  var pad = document.getElementById('pad');
  for (var i = 0; i < V.length; ++i) {
    $('#c' + i).remove();
  }
  for (var i = 0; i < S.length; ++i) {
    $('#s' + i).remove();
  }
  V = [];
  S = [];
}

$(function() {
  setUpGuides();
  $('#pad').mousedown(mdHandler);
  $('#load').click(loadAsset);
  $('#del').click(deleteStroke);
});


})();
