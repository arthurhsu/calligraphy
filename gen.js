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
    var id = '#u' + index.toString();
    $('#type1').contents().find(id).attr('src', asset);
  });
  assetsLower.forEach(function(asset, index) {
    var id = '#l' + index.toString();
    $('#type1').contents().find(id).attr('src', asset);
  });
}

})();
