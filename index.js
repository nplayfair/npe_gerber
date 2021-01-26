const fs = require('fs');
const pcbStackup = require('pcb-stackup');

async function writeSVG(filepath, data) {
  try {
    await fs.promises.writeFile(filepath, data, { flag: 'w' });
  } catch (e) {
    console.error(`Error writing file: ${e.message}`);
  }
}

const fileNames = [
  './gerber/default/copper_bottom.gbr',
  './gerber/default/copper_top.gbr',
  './gerber/default/drill_1_16.xln',
  './gerber/default/silkscreen_bottom.gbr',
  './gerber/default/silkscreen_top.gbr',
  './gerber/default/soldermask_bottom.gbr',
  './gerber/default/soldermask_top.gbr',
  './gerber/default/solderpaste_top.gbr',
  './gerber/default/solderpaste_bottom.gbr',
  './gerber/default/profile.gbr',
]

const layers = fileNames.map(filename => ({
  filename,
  gerber: fs.createReadStream(filename),
}));

pcbStackup(layers).then(stackup => {
  writeSVG('./gerber/pcb.svg', stackup.top.svg);
});