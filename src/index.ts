//Modules
// const AdmZip = require('adm-zip');
import AdmZip from 'adm-zip';
import { emptyDirSync, ensureDirSync } from 'fs-extra';
import path from 'path';
import pcbStackup from 'pcb-stackup';
import sharp from 'sharp';
import { Readable } from 'node:stream';
// import { folder } from 'jszip';
// const { Buffer } = require('node:buffer');
import { existsSync, accessSync, createReadStream, constants } from 'node:fs';

//Class definition
class ImageGenerator implements ZipExtractor, LayerGenerator {
  constructor(
    public folderConfig: FolderConfig,
    public imgConfig: ImageConfig,
    public layerNames?: string[],
  ) {
    // this.tmpDir = folderConfig.tmpDir;
    // this.imgDir = folderConfig.imgDir;
    // this.imgConfig = imgConfig;
    // this.layerNames = layerNames;

    //Ensure folders exist
    if (!existsSync(folderConfig.tmpDir))
      throw new Error('Temp dir does not exist');

    if (!existsSync(folderConfig.imgDir))
      throw new Error('Image dir does not exist');

    //Check folder permissions
    accessSync(folderConfig.tmpDir, constants.R_OK | constants.W_OK);
    accessSync(folderConfig.imgDir, constants.R_OK | constants.W_OK);
  }

  /**
   * Extracts the passed in zip file

   */
  public extractArchive(fileName: string, tmpDir: string): number {
    // Check archive exists
    if (!existsSync(fileName)) {
      throw Error('Archive does not exist.');
    }
    //Check temp folder exists
    if (!existsSync(tmpDir)) {
      throw Error('Temporary folder does not exist.');
    }

    const zip = new AdmZip(fileName);
    zip.extractAllTo(path.join(tmpDir, 'archive'));

    return zip.getEntries().length;
  }

  /**
   * Temporary test method zip file

   */
  public testArchive(fileName: string, tmpDir: string): number {
    // Check archive exists
    try {
      if (!existsSync(fileName)) {
        throw Error('Archive does not exist.');
      }
      if (!existsSync(tmpDir)) {
        throw Error('Temporary folder does not exist.');
      }
    } catch (e: unknown) {
      console.error(e);
    }
    try {
      const zip = new AdmZip(fileName);
      return zip.getEntries().length;
    } catch (error: unknown) {
      console.error(error);
    }
  }

  /**
   * Take in a directory of layer files and return an array of the layers files

   */
  // public getLayers(dir: string, layerNames: string[]) {
  //   new Promise((resolve, reject) => {
  //     // Make sure the directory exists
  //     if (!existsSync(dir)) {
  //       return reject(new Error('Layers folder does not exist.'));
  //     }
  //     // Check that the required layer files exist in source dir
  //     let layersValid = true;
  //     layerNames.forEach((layer) => {
  //       if (!existsSync(path.join(dir, layer))) layersValid = false;
  //     });
  //     if (!layersValid) return reject(new Error('Layer not found.'));
  //     // Construct array of layers that match the supplied filenames array
  //     const layers = layerNames.map((layerName) => ({
  //       filename: layerName,
  //       gerber: createReadStream(path.join(dir, layerName)),
  //     }));
  //     return resolve(layers);
  //   });
  // }

  public getLayers(dir: string, layerNames: string[]): Layers[] {
    if (!existsSync(dir)) throw new Error('Layers folder does not exist');

    //Make sure the layer files exist in the folder
    layerNames.forEach((layerName) => {
      if (!existsSync(path.join(dir, layerName))) {
        throw `Missing layer: ${layerName}`;
      }
    });

    //Construct array of layers
    const layers: Layers[] = layerNames.map((layerName) => ({
      filename: layerName,
      gerber: createReadStream(path.join(dir, layerName)),
    }));
    return layers;
  }

  /**
   * Clean up the archive folder in the specified directory
   * @param {string} dir Path to a directory to clean up
   */
  static cleanupFiles(dir) {
    try {
      const folder = path.join(dir, 'archive');
      emptyDirSync(folder);
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
      // fs.ensureDirSync(this.imgDir, 0o644);
      ensureDirSync(this.imgDir);
    } catch (e) {
      throw new Error(e);
    }

    // Check temp and output dirs exist
    try {
      if (!existsSync(gerber)) {
        throw Error('Archive does not exist.');
      }
      if (!existsSync(this.tmpDir)) {
        throw Error('Temporary folder does not exist.');
      }
      if (!existsSync(this.imgDir)) {
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
      ImageGenerator.getLayers(
        path.join(this.tmpDir, 'archive'),
        this.layerNames,
      )
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

  /**
   * Take an archive containing gerber files and return a stream containing
   * a PNG image from the gerber
   * @param {string} gerber Path to an archive file containing gerber
   * @returns {Promise.<stream.Readable>} Promise that resolves to a PNG stream
   */
  gerberToStream(gerber) {
    // Check temp and output dirs exist
    try {
      if (!existsSync(gerber)) {
        throw Error('Archive does not exist.');
      }
      if (!existsSync(this.tmpDir)) {
        throw Error('Temporary folder does not exist.');
      }
      if (!existsSync(this.imgDir)) {
        throw Error('Output folder does not exist.');
      }
    } catch (e) {
      throw new Error(e);
    }

    return new Promise((resolve, reject) => {
      ImageGenerator.extractArchive(gerber, this.tmpDir);
      ImageGenerator.getLayers(
        path.join(this.tmpDir, 'archive'),
        this.layerNames,
      )
        .then(pcbStackup)
        .then((stackup) => {
          sharp(Buffer.from(stackup.top.svg), {
            density: this.imgConfig.density,
          })
            .resize({ width: this.imgConfig.resizeWidth })
            .png({ compressionLevel: this.imgConfig.compLevel })
            .toBuffer()
            .then((buffer) => {
              ImageGenerator.cleanupFiles(this.tmpDir);
              const stream = new Readable();
              stream.push(buffer);
              stream.push(null);
              resolve(stream);
            });
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
