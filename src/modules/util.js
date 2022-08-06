// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */

class Util {
  static getCode(s) {
    return s.charCodeAt(0).toString(16).toUpperCase();
  }

  static getPath(s) {
    const code = Util.getCode(s);
    return `../data/${code.slice(0, 1)}/${code}.json`;
  }

  static getLegacyPath(s) {
    const code = Util.getCode(s);
    return `../assets/${code.slice(0, 1)}/${code}.png`;
  }

  static fetchGlyph(s) {
    return fetch(Util.getPath(s)).then(resp => {
      return resp.ok ? resp.json() : Promise.resolve(null);
    }, () => {
      return Promise.resolve(null);
    });
  }

  static writeFile(fileName, contents) {
    const streamSaver = window.streamSaver;
    const payload = new TextEncoder().encode(contents);
    const fileStream = streamSaver.createWriteStream(
        fileName, { size: payload.byteLength });
    const writer = fileStream.getWriter();
    writer.write(payload);
    writer.close();
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export {Util}