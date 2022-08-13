// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

class EditorState {
  static DRAW = 'draw';
  static MOVE = 'move';
  static DELETE = 'delete';
  static state = EditorState.DRAW;
}

export {EditorState}