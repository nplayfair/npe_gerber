const AdmZip = require('adm-zip');
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

class ImageGenerator {
  constructor(folderConfig, imgConfig) {
    this.tmpDir = folderConfig.tmpDir;
    this.imgDir = folderConfig.imgDir;
    this.imgConfig = imgConfig;

    // Ensure that the folders exist
    try {
      fs.ensureDirSync(this.tmpDir);
      fs.ensureDirSync(this.imgDir);
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
   * Extracts the passed in zip file
   * @param {string} fileName Name of the file to be extracted
   * @param {string} tmpDir Temporary directory to extract to
   * @returns {Promise} Promise object represents number of files extracted
   */
  static extractArchive(fileName, tmpDir) {
    // Check archive exists
    try {
      if (!fs.existsSync(fileName)) {
        throw Error('Archive does not exist.');
      }
      if (!fs.existsSync(tmpDir)) {
        throw Error('Temporary folder does not exist.');
      }
    } catch (e) {
      throw new Error(e);
    }

    const zip = new AdmZip(fileName);
    zip.extractAllTo(path.join(tmpDir, 'archive'));
  }

  /**
   * Take in a directory of layer files and return an array of the layers files
   * @param {string} dir Directory containing layer files
   * @returns {Array} Array of paths to the layers files
   */
  static getLayers(dir) {
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
  static cleanupFiles(dir) {
    try {
      const folder = path.join(dir, 'archive');
      fs.emptyDirSync(folder);
    } catch (err) {
      throw new Error(err);
    }
  }

  /**
   * Take an archive containing gerber files, config object, temporary dir
   * and output dir and create a PNG image from the gerber in the output dir
   * @param {string} gerber Path to an archive file containing gerber
   * @returns {Promise.<string>} Promise to return path to image
   */
  gerberToImage(gerber) {
    // Create output dir if it doesn't exist
    try {
      fs.ensureDirSync(this.imgDir, 0o644);
    } catch (e) {
      throw new Error(e);
    }

    // Check temp and output dirs exist
    try {
      if (!fs.existsSync(gerber)) {
        throw Error('Archive does not exist.');
      }
      if (!fs.existsSync(this.tmpDir)) {
        throw Error('Temporary folder does not exist.');
      }
      if (!fs.existsSync(this.imgDir)) {
        throw Error('Output folder does not exist.');
      }
    } catch (e) {
      throw new Error(e);
    }

    // Set filenames
    const imageName = path.basename(gerber, '.zip');
    const destFile = `${path.join(this.imgDir, imageName)}.png`;

    return new Promise((resolve, reject) => {
      ImageGenerator.extractArchive(gerber, this.tmpDir);
      ImageGenerator.getLayers(path.join(this.tmpDir, 'archive'))
        .then(pcbStackup)
        .then((stackup) => {
          sharp(Buffer.from(stackup.top.svg), {
            density: this.imgConfig.density,
          })
            .resize({ width: this.imgConfig.resizeWidth })
            .png({ compressionLevel: this.imgConfig.compLevel })
            .toFile(destFile);
        })
        .then(() => {
          ImageGenerator.cleanupFiles(this.tmpDir);
          resolve(destFile);
        })
        .catch((e) => {
          ImageGenerator.cleanupFiles(this.tmpDir);
          reject(new Error(e));
        });
    });
  }
}

module.exports = {
  ImageGenerator,
};
