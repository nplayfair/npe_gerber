const fs          = require('fs');
const pcbStackup  = require('pcb-stackup');
const sharp       = require('sharp');

// Configuration
const resizeWidth = 600;
const density = 1000;
const compLevel = 1;
const destfile = './gerber/pcb3.png';

//Sample gerber
const fileNames = [
  './gerber/default/copper_top.gbr',
  './gerber/default/drill_1_16.xln',
  './gerber/default/silkscreen_top.gbr',
  './gerber/default/soldermask_top.gbr',
  './gerber/default/solderpaste_top.gbr',
  './gerber/default/profile.gbr',
]

const layers = fileNames.map(filename => ({
  filename,
  gerber: fs.createReadStream(filename),
}));

pcbStackup(layers).then(stackup => {
  // Create buffer from SVG string
  sharp(Buffer.from(stackup.top.svg), { density: density })
  .resize({ width: resizeWidth })
  .png({ 
    compressionLevel: compLevel })
  .toFile(destfile)
  .then((info) => {
    console.log(info)
  })
  .catch((e) => {
    console.error(e);
  })
})
.catch((e) => {
  console.error(e);
});
