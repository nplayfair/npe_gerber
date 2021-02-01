const StreamZip = require('node-stream-zip');
const fs = require('fs-extra');
const path = require('path');
const pcbStackup = require('pcb-stackup');
const sharp = require('sharp');

// Filenames we need to extract from the archive
const gerberFiles = [
  'CAMOutputs/DrillFiles/drills.xln',
  'CAMOutputs/GerberFiles/copper_top.gbr',
  'CAMOutputs/GerberFiles/silkscreen_top.gbr',
  'CAMOutputs/GerberFiles/soldermask_top.gbr',
  'CAMOutputs/GerberFiles/solderpaste_top.gbr',
  'CAMOutputs/GerberFiles/profile.gbr',
];

/**
 * Configures the folders used
 * @param {Object} folderConfig Object with properties tmpDir and imgDir containing paths to temporary and image output folders
 */
function config(folderConfig) {
  // Create tmpDir if it does not exist
  fs.ensureDirSync(folderConfig.tmpDir);
  // Create imgDir if it does not exist
  fs.ensureDirSync(folderConfig.imgDir);
}

/**
 * Handle errors, log to console and return the error object
 * @param {Object} Error object
 * @returns {Object} Error object
 */
function handleError(e) {
  // Clean up temp files
  // cleanupFiles();
  console.error(e);
  return e;
}

/**
 * Extracts the passed in zip file
 * @param {string} fileName Name of the file to be extracted
 * @param {string} tmpDir Temporary directory to extract to
 * @returns {Promise} Promise object represents number of files extracted
 */
function extractArchive(fileName, tmpDir) {
  // Configure archive to use
  const archive = new StreamZip({
    file: fileName,
    storeEntries: true,
  });
  return new Promise((resolve, reject) => {
    // Try to extract
    archive.on('ready', () => {
      const extDir = path.join(tmpDir, 'archive');
      fs.mkdirSync(extDir, { recursive: true });
      archive.extract(null, extDir, (err, count) => {
        if (!err) {
          archive.close();
          resolve(count);
        } else {
          const errMsg = 'Error extracting archive';
          console.err(errMsg);
          archive.close();
          reject(errMsg);
        }
      });
    });
  });
}

/**
 * Take in a zip file and return an array of the layers files
 * @param {string} fileName Name of the file to be extracted
 * @param {string} tmpDir Temporary directory to extract to
 * @returns {Array} Array of paths to the layers files
 */
function getLayers(fileName, tmpDir) {
  return new Promise((resolve, reject) => {
    const extractDir = path.join(tmpDir, 'archive');
    extractArchive(fileName, tmpDir)
      .then((numfiles) => {
        console.log(`${numfiles} files extracted successfully`);
        const layers = gerberFiles.map((layerName) => ({
          filename: layerName,
          gerber: fs.createReadStream(path.join(extractDir, layerName)),
        }));
        if (numfiles > 0) {
          // Some files were extracted
          resolve(layers);
        } else {
          const errMsg = 'No files were extracted';
          reject(errMsg);
        }
      })
      .catch((e) => {
        console.log(e);
      });
  });
}

function getLayers2(dir) {
  return new Promise((resolve, reject) => {
    // Make sure the directory exists
    if (!fs.existsSync(dir)) {
      return reject(new Error('Layers folder does not exist.'));
    }
    // Check that the required layer files exist in source dir
    let layersValid = true;
    gerberFiles.forEach((layer) => {
      if (!fs.existsSync(path.join(dir, layer))) layersValid = false;
    });
    if (!layersValid) return reject(new Error('Layer not found.'));
    // Construct array of layers that match the supplied filenames array
    const layers = gerberFiles.map((layerName) => ({
      filename: layerName,
      gerber: fs.createReadStream(path.join(dir, layerName)),
    }));
    return resolve(layers);
  });
}

/**
 * Clean up the archive folder in the specified directory
 * @param {string} dir Path to a directory to clean up
 */
function cleanupFiles(dir) {
  try {
    const folder = path.join(dir, 'archive');
    fs.emptyDirSync(folder);
    console.log('Temp files removed.');
  } catch (err) {
    console.error(err);
  }
}

/**
 * Take an archive containing gerber files, config object, temporary dir
 * and output dir and create a PNG image from the gerber in the output dir
 * @param {string} gerber Path to an archive file containing gerber
 * @param {Object} config Object containing sharp settings for resizeWidth, compLevel and density
 * @param {string} tmpDir Temporary directory to extract the archive to
 * @param {string} outputDir Directory to save the image to
 */
function gerberToImage(gerber, imgConfig, tmpDir, outputDir) {
  // Set filenames
  const imageName = path.basename(gerber, '.zip');
  const destFile = `${path.join(outputDir, imageName)}.png`;

  // Make sure output dir exists
  try {
    fs.ensureDirSync(outputDir);
  } catch (e) {
    console.error(e);
  }

  return new Promise((resolve, reject) => {
    getLayers(gerber, tmpDir)
      .then(pcbStackup)
      .then((stackup) => {
        sharp(Buffer.from(stackup.top.svg), { density: imgConfig.density })
          .resize({ width: imgConfig.resizeWidth })
          .png({ compressionLevel: imgConfig.compLevel })
          .toFile(destFile);
      })
      .then(() => {
        cleanupFiles(tmpDir);
        resolve(destFile);
      })
      .catch((e) => {
        cleanupFiles(tmpDir);
        handleError(e);
        reject(e);
      });
  });
}

module.exports = {
  config,
  gerberToImage,
};
