(function() {

function SVG(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

/* 
 * Lazy Line Painter - Path Object 
 * Generated using 'SVG to Lazy Line Converter'
 * 
 * http://lazylinepainter.info 
 * Copyright 2013, Cam O'Connell  
 *  
 */ 
 
var pathObj = {
    "char": {
        "strokepath": [
            {
                "path": "M 261 74 C 231.17 123.92 201.33 173.83 167 218 132.67 262.17 93.83 300.58 55 339",
                "duration": 600
            },
            {
                "path": "M 253 100 C 290.18 133.82 327.36 167.64 354 196 380.64 224.36 396.76 247.24 418 266 439.24 284.76 465.62 299.38 492 314",
                "duration": 600
            },
            {
                "path": "M 207 228 C 220.92 230.00 234.83 232.00 252 229 269.17 226.00 289.58 218.00 310 210",
                "duration": 600
            },
            {
                "path": "M 178 323 C 200.60 316.60 223.20 310.20 245 305 266.80 299.80 287.80 295.80 303 294 318.20 292.20 327.60 292.60 337 293",
                "duration": 600
            },
            {
                "path": "M 257 232 C 258.64 241.16 260.29 250.31 261 273 261.71 295.69 261.49 331.91 261 360 260.51 388.09 259.76 408.04 259 428",
                "duration": 600
            },
            {
                "path": "M 182 365 C 187.75 376.25 193.50 387.50 200 388 206.50 388.50 213.75 378.25 221 368",
                "duration": 600
            },
            {
                "path": "M 325 330 C 333.50 336.00 342.00 342.00 340 350 338.00 358.00 325.50 368.00 313 378",
                "duration": 600
            },
            {
                "path": "M 145 451 C 173.04 444.02 201.09 437.04 227 432 252.91 426.96 276.69 423.84 301 424 325.31 424.16 350.16 427.58 375 431",
                "duration": 600
            }
        ],
        "dimensions": {
            "width": 512,
            "height": 512
        }
    }
}; 
 
 
/* 
 Setup and Paint your lazyline! 
 */ 
 
 $(document).ready(function(){ 
 $('#char').lazylinepainter( 
 {
    "svgData": pathObj,
    "strokeWidth": 16,
    "strokeColor": "blue"
}).lazylinepainter('paint'); 
 });


})();
