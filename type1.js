/**
 * @license
 * Copyright 2015 Arthur Hsu. Distributed under Creative Commons License.
 */

(function() {

// When the page loads.
$(function() {
  var src = 'src="assets/blank.png" />';
  for (var i = 0; i < 3; ++i) {
    for (var j = 0; j < 10; ++j) {
      var id = i.toString() + j.toString() + '" ';
      var cls = i.toString() + ' c' + j.toString();
      if (i > 0) {
        cls = cls + ' t';
      }
      cls = cls + '" ';
      $('#upper').prepend('<img id="u' + id + 'class="u' + cls + src);
      $('#lower').prepend('<img id="l' + id + 'class="l' + cls + src);
    }
  }
});

})();
