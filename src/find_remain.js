// @ts-check
/**
 * @license
 * Copyright 2022 Arthur Hsu. Distributed under Creative Commons License.
 */
const fs = require('fs');
const path = require('path');

function output(code) {
  const word = String.fromCharCode(parseInt(code, 16));
  console.log(`${code} ${word}`);
}

function main() {
  const assets = path.resolve(__dirname + '/../assets');
  const data = path.resolve(__dirname + '/../data');
  const code = ['/4', '/5', '/6', '/7', '/8', '/9'];
  code.forEach(prefix => {
    const afiles = fs.readdirSync(path.resolve(assets + prefix));
    const dfiles = fs.readdirSync(path.resolve(data + prefix));
    const codeSet = new Set();
    dfiles.forEach(f => codeSet.add(f.substring(0, 4)));
    afiles.forEach(f => {
      const code = f.substring(0, 4);
      if (!codeSet.has(code)) output(code); 
    });
  });
}

main();