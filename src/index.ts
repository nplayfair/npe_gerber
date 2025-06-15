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
  public testArchive(fileName: string, tmpDir: string) {
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

  //Take in a directory of layer files and return an array of the layers files
  // public getLayersOld(dir: string, layerNames: string[]): Promise<Layers[]> {
  //   if (!existsSync(dir)) throw new Error('Layers folder does not exist');

  //   //Make sure the layer files exist in the folder
  //   layerNames.forEach((layerName) => {
  //     if (!existsSync(path.join(dir, layerName))) {
  //       throw `Missing layer: ${layerName}`;
  //     }
  //   });

  //Construct array of layers
  // const layers: Layers[] = layerNames.map((layerName) => ({
  //   filename: layerName,
  //   gerber: createReadStream(path.join(dir, layerName)),
  // }));
  // return layers;
  // const layerPromise = new Promise<Layers[]>(function (resolve, reject) {
  //   const layers: Layers[] = layerNames.map((layerName) => ({
  //     filename: layerName,
  //     gerber: createReadStream(path.join(dir, layerName)),
  //   }));
  //   resolve(layers);
  // });

  // return layerPromise;
  // }

  //Layer promise
  public getLayers(dir: string, layerNames: string[]): Promise<Layers[]> {
    //Check correct number of layers and folder exists
    layerNames.forEach((layerName) => {
      if (!existsSync(path.join(dir, layerName))) {
        throw `Missing layer: ${layerName}`;
      }
    });
    if (!existsSync(dir)) {
      throw new Error('Folder not there');
    }
    //Return layer promise
    const layersPromise = new Promise<Layers[]>(function (resolve, reject) {
      const layers: Layers[] = layerNames.map((layerName: string) => ({
        filename: layerName,
        gerber: createReadStream(path.join(dir, layerName)),
      }));
      resolve(layers);
    });
    return layersPromise;
  }

  //Clean up the archive folder in the specified directory
  public static cleanupFiles(dir: string): void {
    try {
      const folder = path.join(dir, 'archive');
      emptyDirSync(folder);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      }
    }
  }

  //  * Take an archive containing gerber files, config object, temporary dir
  //  * and output dir and create a PNG image from the gerber in the output dir
  //  * @param {string} gerber Path to an archive file containing gerber
  //  * @returns {Promise.<string>} Promise to return path to image

  public gerberToImage(gerber: string) {
    // Create output dir if it doesn't exist
    try {
      ensureDirSync(this.folderConfig.imgDir);
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      }
    }

    // Check temp and output dirs exist
    try {
      if (!existsSync(gerber)) {
        throw Error('Archive does not exist.');
      }
      if (!existsSync(this.folderConfig.tmpDir)) {
        throw Error('Temporary folder does not exist.');
      }
      if (!existsSync(this.folderConfig.imgDir)) {
        throw Error('Output folder does not exist.');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      }
    }

    // Set filenames
    //Use the filename of the gerber zip to determine the output png filename
    const imageName = path.basename(gerber, '.zip');
    const destFile = `${path.join(this.folderConfig.imgDir, imageName)}.png`;

    return new Promise((resolve, reject) => {
      if (!this.layerNames) {
        throw new Error('You must supply an array of layer names.');
      }
      this.extractArchive(gerber, this.folderConfig.tmpDir);
      this.getLayers(
        path.join(this.folderConfig.tmpDir, 'archive'),
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
          ImageGenerator.cleanupFiles(this.folderConfig.tmpDir);
          resolve(destFile);
        })
        .catch((e) => {
          ImageGenerator.cleanupFiles(this.folderConfig.tmpDir);
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
  gerberToStream(gerber: string) {
    // Check temp and output dirs exist
    try {
      if (!existsSync(gerber)) {
        throw Error('Archive does not exist.');
      }
      if (!existsSync(this.folderConfig.tmpDir)) {
        throw Error('Temporary folder does not exist.');
      }
      if (!existsSync(this.folderConfig.imgDir)) {
        throw Error('Output folder does not exist.');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      }
    }

    return new Promise((resolve, reject) => {
      this.extractArchive(gerber, this.folderConfig.tmpDir);
      this.getLayers(
        path.join(this.folderConfig.tmpDir, 'archive'),
        this.layerNames!,
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
              ImageGenerator.cleanupFiles(this.folderConfig.tmpDir);
              const stream = new Readable();
              stream.push(buffer);
              stream.push(null);
              resolve(stream);
            });
        })
        .catch((e) => {
          ImageGenerator.cleanupFiles(this.folderConfig.tmpDir);
          reject(new Error(e));
        });
    });
  }
}

module.exports = {
  ImageGenerator,
};
