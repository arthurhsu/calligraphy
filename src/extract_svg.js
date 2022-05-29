const fs = require('fs');
const path = require('path');

function parseSVG(f, code) {
  // Skip non-SVG files
  if (f.indexOf('.svg') == -1) return;
  
  const contents = fs.readFileSync(f, 'utf-8').split('>');
  let json = {
    code: code.substring(0, 4),
    text: undefined,
    strokes:[]
  };
  contents.forEach(l => {
    if (l.endsWith('</title')) {
      json.text = l.substring(0, 1);
    }
    if (l.startsWith('<path')) {
      const start = l.indexOf('d="');
      const stroke = l.substring(start+3, l.length-1);
      json.strokes.push(stroke);
    }
  });
  
  const fileName = path.resolve(
      `${__dirname}/../data/${json.code.substring(0, 1)}/${json.code}.json`);
  fs.writeFileSync(fileName, JSON.stringify(json), 'utf-8');
}

function main() {
  const svgDir = path.resolve(`${__dirname}/../svg`);
  const subDirs = fs.readdirSync(svgDir);
  subDirs.forEach(d => {
    const files = fs.readdirSync(path.resolve(`../svg/${d}`));
    files.forEach(f => {
      parseSVG(path.resolve(`../svg/${d}/${f}`), f);
    });
  });
}

main();