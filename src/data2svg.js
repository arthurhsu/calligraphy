const fs = require('fs');
const path = require('path');

function toSVG(filePath, code, glyph = 0, color = 'blue', width = 16) {
  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let contents = [];
  contents.push(
      '<svg xmlns="http://www.w3.org/2000/svg" viewbox="0 0 512 512">');
  contents.push(`<title>${json.text}</title>`);
  contents.push('<metadata>');
  contents.push(
      '<rdf:RDF xmlns:cc="http://web.resource.org/cc/" ' +
      'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">');
  contents.push('<cc:work rdf:about="">');
  contents.push(
      '<cc:license rdf:resource=' +
      '"https://github.com/arthurhsu/calligraphy/blob/master/LICENSE"/>');
  contents.push('</cc:work>');
  contents.push('</rdf:RDF>');
  contents.push('</metadata>');
  contents.push('<style>');
  contents.push(
      `path{stroke:${color};fill:none;stroke-width:${width};` +
      'stroke-linecap:round}');
  contents.push('</style>');
  json.glyphs[glyph].strokes.forEach(s => {
    s.splines.forEach(p => contents.push(`<path d="${p}"></path>`));
  });
  contents.push('</svg>');
  console.log(contents.join(''));
}

function main() {
  if (process.argc < 3 || process.argc > 6) {
    console.error('Usage: data2svg <Unicode> [glyph] [color] [stroke width]');
    process.exit(1);
  }
  const code = process.argv[2].toString();
  const filePath = path.resolve(
      `${__dirname}/../data/${code.substring(0, 1)}/${code}.json`);
  if (fs.existsSync(filePath)) {
    toSVG(filePath, code, process.argv[3], process.argv[4], process.argv[5]);
  }
}

main();