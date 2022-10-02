// @ts-check
/**
 * @license
 * Copyright 2015 Arthur Hsu. Distributed under Creative Commons License.
 */

import {Canvas} from './modules/canvas.js';
import {Guide} from './modules/guide.js';
import {GlyphEditor} from './modules/glyph_editor.js';
import {MouseHandler} from './modules/mouse_handler.js';
import {StrokeEditor} from './modules/stroke_editor.js';

function acquireGlyph() {
  let moveOn = false;
  while (!moveOn) {
    const text = prompt('Input a Kanji to start:');
    if (text && text.length == 1) {
      GlyphEditor.get().load(text);
      moveOn = true;
    }
  }
}

function setupCanvasHandlers(
    size, main, preview1, preview2, bgImage, target, tagContainer) {
  Canvas.size = size;
  Canvas.main = main;
  Canvas.preview1 = preview1;
  Canvas.preview2 = preview2;
  Canvas.bgImage = bgImage;
  Canvas.target = target;
  Canvas.tagContainer = tagContainer;

  Guide.drawCanvas(size, Canvas.main);
  MouseHandler.get().install();
}

function setupGlyphHandlers(
    glyphSelector, moveCheck, addBtn, zoomBtn, hzoomBtn, vzoomBtn, hashtagBtn,
    importBtn, copyBtn, rotateBtn) {
  GlyphEditor.get().install(
      glyphSelector, moveCheck, addBtn, zoomBtn, hzoomBtn, vzoomBtn, hashtagBtn,
      importBtn, copyBtn, rotateBtn);
}

function setupStrokeHandlers(
    strokeSelector, editingRadio, undoBtn, eraseBtn, addBtn) {
  StrokeEditor
      .get()
      .install(strokeSelector, editingRadio, undoBtn, eraseBtn, addBtn);
}

function setupWordHandlers(loadBtn, exportBtn, xSlider, ySlider) {
  $(exportBtn).on('click', () => {
    GlyphEditor.get().export();
  });

  $(loadBtn).on('change', () => {
    if ($(loadBtn).prop('checked')) {
      GlyphEditor.get().loadLegacy();
    } else {
      GlyphEditor.get().clearBackground();
    }
  });

  $(xSlider).on('change', e => {
    GlyphEditor.get().hshift(e);
  });

  $(ySlider).on('change', e => {
    GlyphEditor.get().vshift(e);
  });
}

function setupShuffleHandlers(shuffleBtn, dialog, sortable, done) {
  $(dialog).dialog({
    autoOpen: false,
    buttons: {
      'OK': () => {
        const arr = $(sortable).children();
        const newOrder = [];
        for (let i = 0; i < arr.length; ++i) {
          newOrder.push(arr[i]['value']);
        }
        console.log(newOrder);
        GlyphEditor.get().shuffle(newOrder);
        $(dialog).dialog('close');
      },
      'Cancel': () => {
        $(dialog).dialog('close');
      }
    }
  });
  $(sortable).sortable({
    connectWith: sortable,
    zIndex: 99999,
    helper: function() {
      let helper = $( '.sortHelper li' );
      if ( !helper.length ) {
          helper = $('<ul><li></li></ul>')
              .addClass( 'sortHelper' )
              .appendTo( 'body' )
              .find( 'li' )
              .css( { 'z-index': 9999 } );
      }
      return helper;
    },
    start: function(event, ui) {
      ui.helper.text(ui.item.text());
    }
  });
  $(shuffleBtn).on('click', () => {
    if ($(dialog).dialog('isOpen' == false)) {
      const numStrokes =
          GlyphEditor.get().getCurrentGlyph().getNumberOfStrokes();
      if (numStrokes <= 0) return;
      $(sortable).empty();
      for (let i = 0; i < numStrokes; i++) {
        $(sortable).append(`<li value=${i}>S${i}</li>`);
      }
      $(dialog).dialog('open');
    }
  });
  $(done).on('click', () => {
    $(dialog).dialog('close');
  });
}

function setupBatchHandlers(
    refresh, batch, moveBtn, zoomBtn, hzoomBtn, vzoomBtn, rotateBtn) {
  GlyphEditor.get().installBatch(
      refresh, batch, moveBtn, zoomBtn, hzoomBtn, vzoomBtn, rotateBtn);
}

export {acquireGlyph,
        setupBatchHandlers,
        setupCanvasHandlers,
        setupGlyphHandlers,
        setupShuffleHandlers,
        setupStrokeHandlers,
        setupWordHandlers}