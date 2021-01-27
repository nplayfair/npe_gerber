const StreamZip = require('node-stream-zip');
const fs = require('fs-extra');
const path = require('path');

// Filenames we need to extract from the archive
const gerberFiles = [
  'CAMOutputs/DrillFiles/drills.xln',
  'CAMOutputs/GerberFiles/copper_top.gbr',
  'CAMOutputs/GerberFiles/silkscreen_top.gbr',
  'CAMOutputs/GerberFiles/soldermask_top.gbr',
  'CAMOutputs/GerberFiles/solderpaste_top.gbr',
  'CAMOutputs/GerberFiles/profile.gbr'
]

/**
 * Extracts the passed in zip file
 * @param {string} fileName
 * @returns {Promise} Promise object represents number of files extracted
 */
function extractArchive(fileName) {
  // Configure archive to use
  const archive =  new StreamZip({
    file: fileName,
    storeEntries: true
  });
  return new Promise((resolve, reject) => {
    // Try to extract
    archive.on('ready', () => {
      let extDir = path.join(__dirname, 'gerber', 'tmp', 'archive');
      fs.mkdirSync(extDir, { recursive: true });
      archive.extract(null, extDir, (err, count) => {
        if(!err) {
          archive.close();
          resolve(count);
        } else {
          const errMsg = 'Error extracting archive';
          console.err(errMsg);
          archive.close();
          reject(errMsg)
        }
      })
    })
  })
}

async function getLayers(fileName) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, 'gerber', 'tmp', 'archive');
    extractArchive(fileName)
      .then(numfiles => {
        console.log(`${numfiles} files extracted successfully`);
        const layers = gerberFiles.map(fileName => ({
          filename: fileName,
          gerber: fs.createReadStream(path.join(tempDir, fileName))
        }));
        if(numfiles > 0) {
          // Some files were extracted
          resolve(layers);
        } else {
          reject();
        }
      })
      .catch(e => {
        console.log(e);
      })
  })
}

async function cleanupFiles() {
  try {
    let folder = path.join(__dirname, 'gerber', 'tmp');
    await fs.emptyDirSync(folder);
    console.log('Temp files removed.');
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  extractArchive,
  getLayers,
  cleanupFiles
}