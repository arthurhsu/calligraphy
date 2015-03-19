/**
 * @license
 * Copyright 2015 Arthur Hsu. Distributed under Creative Commons License.
 */

(function() {

// When the page loads.
$(function() {
  $('#start').click(function() {
    var assetsUpper = getAssets('#upper');
    var assetsLower = getAssets('#lower');
    generateSheet(assetsUpper, assetsLower);
  });

  $('#print').click(function() {
    $('#type1').get(0).contentWindow.print();
  });
});

function getAssets(id) {
  var text = $(id).val().trim();
  if (text.length) {
    var assets = new Array(text.length);
    for (var i = 0; i < text.length; ++i) {
      assets[i] =
        'assets/' +
        text.charCodeAt(i).toString(16).toUpperCase() +
        '.png';
    }
    return assets;
  }
  return [];
}

function generateSheet(assetsUpper, assetsLower) {
  assetsUpper.forEach(function(asset, index) {
    for (var i = 0; i < 3; ++i) {
      var id = '#u' + i.toString() + index.toString();
      $('#type1').contents().find(id).attr('src', asset);
    }
  });
  assetsLower.forEach(function(asset, index) {
    for (var i = 0; i < 3; ++i) {
      var id = '#l' + i.toString() + index.toString();
      $('#type1').contents().find(id).attr('src', asset);
    }
  });
}

})();
