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

let newLayers = [];

// Use a sample zip archive

const zip =  new StreamZip({
  file: './gerber/sho_v2.zip',
  storeEntries: true
});

function countFiles() {
  // Read the zip file
  zip.on('ready', () => {
    console.log('Entries read: ' + zip.entriesCount);
    for (const entry of Object.values(zip.entries())) {
      const desc = entry.isDirectory ? 'directory' : `${entry.size} bytes`;
      console.log(`Entry ${entry.name}: ${desc}`);
    }
    zip.close()
  });
}

function getFiles() {
  // Get the gerber files from the zip archive
  zip.on('ready', () => {
    let fileName = 'CAMOutputs/GerberFiles/silkscreen_top.gbr';
    zip.stream(fileName, (err, stm) => {
      newLayers.push({
        filename: fileName,
        gerber: stm
      });
      stm.on('end', () => zip.close());
      console.log(newLayers);
    });
  });
}

async function getLayers2(fileName) {
  const tempDir = path.join(__dirname, 'gerber', 'tmp', 'archive');
  const archive =  new StreamZip({
    file: fileName,
    storeEntries: true
  });
  try {
    archive.on('ready', () => {
      fs.mkdirSync(tempDir, { recursive: true });
      archive.extract(null, tempDir, (err, count) => {
        console.log(err ? 'Extract error' : `Extracted ${count} entries`);
        const layers = gerberFiles.map(fileName => ({
          filename: fileName,
          gerber: fs.createReadStream(path.join(tempDir, fileName))
        }));
        archive.close();
        return layers;
      });
    });
  } catch (err) {
    console.error(err);
  }
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

// Helper methods
function validFiles(file) {
  return gerberFiles.includes(file);
}

function layerBuild(filename) {
  fs.createReadStream(filename);
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

function getStream(fileName) {
  let stream;
  zip.on('ready', () => {
    stream = zip.entryDataSync(fileName);
      zip.close();
  console.log(stream);
  })
}


// We want to return an array of layers


exports.countFiles = countFiles;
exports.extractArchive = extractArchive;
exports.cleanupFiles = cleanupFiles;
exports.getLayers = getLayers;