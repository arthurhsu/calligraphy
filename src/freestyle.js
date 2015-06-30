/**
 * @license
 * Copyright 2015 Arthur Hsu. Distributed under Creative Commons License.
 */

(function() {

function generate() {
  var rows = parseInt($('#rows').val(), 10);
  var cols = parseInt($('#cols').val(), 10);

  var lines = $('#contents').val().split('\n');
  var rows = lines.length;
  var cols = lines.reduce(function(prev, cur) {
    return prev.length > cur.length ? prev : cur;
  }).length;
  console.log(rows, cols);

  // Clear existing contents.
  var body = $('#output').contents().find('body');
  body.empty();
  
  var class1 = $('#rotate').is(':checked') ? ' r' : '';
  var class2 = $('#lighter').is(':checked') ? ' t' : '';
  // Append new contents
  for (var i = 0; i < rows; ++i) {
    for (var j = 0; j < cols; ++j) {
      // Background cell
      var bg = $('<img class="bg" src="../assets/cell.png"></img>');
      var top = 81 + i * 105;
      var left = 81 + j * 105;
      bg.attr('style', 'width:108px; top:' + top + 'px; left:' + left + 'px;'); 
      body.append(bg);

      // Foreground cell
      var code = lines[i].charCodeAt(j).toString(16).toUpperCase();
      var src = '../assets/' + code.slice(0, 1) + '/' + code + '.png';
      var fg = $('<img></img>');
      fg.attr('src', src);
      fg.attr('class', 'fg' + class1 + class2);
      fg.attr('style',
          'width:101px; top:' + (top + 3) + 'px; left:' + (left + 3) + 'px;');
      body.append(fg);
    }
  }
}

function initIFrame() {
  var head = $('#output').contents().find('head');
  var style =
      '<style>\n' +
      'body { width: 1216px; height: 1455px; margin: 0px 0px 0px 0px; }\n' +
      '@page { margin: 1px 1px 1px 1px; }\n' +
      'img { position: absolute; }\n' +
      'img.bg { z-index: 0; }\n' +
      'img.fg { z-index: 1; }\n' +
      'img.r { transform: rotate(270deg); }\n' +
      'img.t { opacity: 0.4; filter: alpha(opacity=40); }\n' +
      '</style>\n';
  head.append($(style));
}

// When the page loads.
$(function() {
  $('#submit').click(generate);
  $('#print').click(function() {
    $('#output').get(0).contentWindow.print();
  });

  initIFrame();
});


})();
