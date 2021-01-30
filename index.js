const pcbStackup  = require('pcb-stackup');
const sharp       = require('sharp');
const path        = require('path');
const fileProc    = require('./fileProcessor.js');

// Configuration
const config = {
  resizeWidth: 600,
  density: 1000,
  compLevel: 1,
}

// Functions
async function gerberToImage(gerber, imageName) {
  return new Promise((resolve, reject) => {
    const destFile = path.join(__dirname, 'gerber', 'pcb', imageName);
    fileProc.getLayers(gerber)
      .then(layers => {
        pcbStackup(layers).then(stackup => {
          // Create buffer from SVG string
          sharp(Buffer.from(stackup.top.svg), { density: config.density })
          .resize({ width: config.resizeWidth })
          .png({ 
            compressionLevel: config.compLevel })
          .toFile(destFile)
          .then((info) => {
            // Succesful
            fileProc.cleanupFiles();
            resolve(info);
          })
          .catch((e) => {
            fileProc.cleanupFiles();
            reject(e);
          })
        })
      .catch((e) => {
        reject(e);
      });
    })
  })
}

gerberToImage('./gerber/Timmy.zip', 'timmy.png').then(info => console.log(info))
  .catch(e => {
    console.error(e);
  })
