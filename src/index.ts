//Modules
import AdmZip from 'adm-zip';
import { emptyDirSync, ensureDirSync } from 'fs-extra';
import path from 'path';
import pcbStackup from 'pcb-stackup';
import sharp from 'sharp';
import { Readable } from 'node:stream';
import { existsSync, createReadStream, accessSync, constants } from 'node:fs';

//Class definition
export class ImageGenerator {
  constructor(
    public folderConfig: FolderConfig,
    public imgConfig: ImageConfig,
    public layerNames: string[],
  ) {
    //Ensure folders exist
    if (!this.validFolder(folderConfig.tmpDir, true))
      throw new Error('Temp directory is invalid');

    if (!this.validFolder(folderConfig.imgDir, true))
      throw new Error('Image directory is invalid');
  }

  //Take an archive containing gerber files, config object, temporary dir
  //and output dir and create a PNG image from the gerber in the output dir
  public gerberToImage(gerber: string) {
    //Check gerber archive exists
    if (!existsSync(gerber)) {
      throw Error('Archive does not exist.');
    }

    // Create output dir if it doesn't exist
    try {
      ensureDirSync(this.folderConfig.imgDir);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
    }

    // Set filenames
    //Use the filename of the gerber zip to determine the output png filename
    const imageName = path.basename(gerber, '.zip');
    const destFile = `${path.join(this.folderConfig.imgDir, imageName)}.png`;

    return new Promise((resolve, reject) => {
      if (!this.layerNames) {
        reject('You must supply an array of layer names.');
      }
      //Extract the passed in zip file
      this.extractArchive(gerber, this.folderConfig.tmpDir);
      //Check all layers present
      this.layerNames.forEach((layerName) => {
        if (
          !existsSync(path.join(this.folderConfig.tmpDir, 'archive', layerName))
        ) {
          this.cleanupFiles(this.folderConfig.tmpDir);
          reject(`Missing layer: ${layerName}`);
        }
      });
      this.getLayers(
        path.join(this.folderConfig.tmpDir, 'archive'),
        this.layerNames,
      )
        .then(pcbStackup)
        .then((stackup) => {
          sharp(Buffer.from(stackup.top.svg as ArrayLike<number>), {
            density: this.imgConfig.density,
          })
            .resize({ width: this.imgConfig.resizeWidth })
            .png({ compressionLevel: this.imgConfig.compLevel })
            .toFile(destFile);
        })
        .then(() => {
          this.cleanupFiles(this.folderConfig.tmpDir);
          resolve(destFile);
        })
        .catch((e) => {
          this.cleanupFiles(this.folderConfig.tmpDir);
          reject(new Error(e));
        });
    });
  }

  /**
   * Take an archive containing gerber files and return a stream containing
   * a PNG image from the gerber */

  gerberToStream(gerber: string) {
    // Check gerber archive exists
    if (!existsSync(gerber)) {
      throw Error('Archive does not exist.');
    }

    return new Promise((resolve, reject) => {
      this.extractArchive(gerber, this.folderConfig.tmpDir);
      if (!this.layerNames) throw new Error('No layers provided');
      //Check all layers present
      this.layerNames.forEach((layerName) => {
        if (
          !existsSync(path.join(this.folderConfig.tmpDir, 'archive', layerName))
        ) {
          this.cleanupFiles(this.folderConfig.tmpDir);
          reject(`Missing layer: ${layerName}`);
        }
      });
      this.getLayers(
        path.join(this.folderConfig.tmpDir, 'archive'),
        this.layerNames,
      )
        .then(pcbStackup)
        .then((stackup) => {
          sharp(Buffer.from(stackup.top.svg as ArrayLike<number>), {
            density: this.imgConfig.density,
          })
            .resize({ width: this.imgConfig.resizeWidth })
            .png({ compressionLevel: this.imgConfig.compLevel })
            .toBuffer()
            .then((buffer) => {
              this.cleanupFiles(this.folderConfig.tmpDir);
              const stream = new Readable();
              stream.push(buffer);
              stream.push(null);
              resolve(stream);
            });
        })
        .catch((e) => {
          this.cleanupFiles(this.folderConfig.tmpDir);
          reject(new Error(e));
        });
    });
  }

  //Layer methods
  //Returns promise that resolves to array of Layers
  private getLayers(dir: string, layerNames: string[]): Promise<Layers[]> {
    //Check correct number of layers and folder exists
    // try {
    //   layerNames.forEach((layerName) => {
    //     if (!existsSync(path.join(dir, layerName))) {
    //       this.cleanupFiles(dir);
    //       throw new Error(`Missing layer: ${layerName}`);
    //     }
    //   });
    // } catch (error: unknown) {
    //   if (error instanceof Error) {
    //     {
    //       console.error(error.message);
    //     }
    //   }
    // }

    //Return layer promise
    const layersPromise = new Promise<Layers[]>(function (resolve, reject) {
      const layers: Layers[] = layerNames.map((layerName: string) => ({
        filename: layerName,
        gerber: createReadStream(path.join(dir, layerName)),
      }));
      if (layers.length === layerNames.length) {
        resolve(layers);
      } else {
        reject(new Error('Invalid layer count'));
      }
    });
    return layersPromise;
  }

  //File methods
  //Check that a folder exists and is writeable
  private validFolder(dir: string, checkPerms?: boolean): boolean {
    if (!existsSync(dir)) {
      throw Error('Folder does not exist.');
    }
    //Check folder permissions, will throw error if not readable or writeable
    if (checkPerms) {
      accessSync(dir, constants.R_OK | constants.W_OK);
      accessSync(dir, constants.R_OK | constants.W_OK);
    }

    //All checks passed
    return true;
  }

  private extractArchive(fileName: string, outputDir: string): number {
    //Check archive exists
    if (!existsSync(fileName)) {
      throw Error('Archive does not exist.');
    }

    //Check output dir is valid
    if (!this.validFolder(outputDir, true))
      throw new Error('Output directory is not valid');

    //Attempt to extract archive
    const zip = new AdmZip(fileName);
    try {
      zip.extractAllTo(path.join(outputDir, 'archive'));
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
        return 0;
      }
    }
    return zip.getEntries().length;
  }

  //Clean up the archive folder in the specified directory
  private cleanupFiles(dir: string): void {
    try {
      const folder = path.join(dir, 'archive');
      emptyDirSync(folder);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      }
    }
  }
}
