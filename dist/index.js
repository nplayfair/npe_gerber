"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageGenerator = void 0;
//Modules
// const AdmZip = require('adm-zip');
const adm_zip_1 = __importDefault(require("adm-zip"));
const fs_extra_1 = require("fs-extra");
const path_1 = __importDefault(require("path"));
const pcb_stackup_1 = __importDefault(require("pcb-stackup"));
const sharp_1 = __importDefault(require("sharp"));
const node_stream_1 = require("node:stream");
const node_fs_1 = require("node:fs");
//Class definition
class ImageGenerator {
    constructor(folderConfig, imgConfig, layerNames) {
        this.folderConfig = folderConfig;
        this.imgConfig = imgConfig;
        this.layerNames = layerNames;
        //Ensure folders exist
        if (!(0, node_fs_1.existsSync)(folderConfig.tmpDir))
            throw new Error('Temp dir does not exist');
        if (!(0, node_fs_1.existsSync)(folderConfig.imgDir))
            throw new Error('Image dir does not exist');
        //Check folder permissions
        (0, node_fs_1.accessSync)(folderConfig.tmpDir, node_fs_1.constants.R_OK | node_fs_1.constants.W_OK);
        (0, node_fs_1.accessSync)(folderConfig.imgDir, node_fs_1.constants.R_OK | node_fs_1.constants.W_OK);
    }
    /**
     * Extracts the passed in zip file
  
     */
    extractArchive(fileName, tmpDir) {
        // Check archive exists
        if (!(0, node_fs_1.existsSync)(fileName)) {
            throw Error('Archive does not exist.');
        }
        //Check temp folder exists
        if (!(0, node_fs_1.existsSync)(tmpDir)) {
            throw Error('Temporary folder does not exist.');
        }
        const zip = new adm_zip_1.default(fileName);
        zip.extractAllTo(path_1.default.join(tmpDir, 'archive'));
        return zip.getEntries().length;
    }
    /**
     * Temporary test method zip file
  
     */
    testArchive(fileName, tmpDir) {
        // Check archive exists
        try {
            if (!(0, node_fs_1.existsSync)(fileName)) {
                throw Error('Archive does not exist.');
            }
            if (!(0, node_fs_1.existsSync)(tmpDir)) {
                throw Error('Temporary folder does not exist.');
            }
        }
        catch (e) {
            console.error(e);
        }
        const zip = new adm_zip_1.default(fileName);
        return zip.getEntries().length;
    }
    //Layer promise
    getLayers(dir, layerNames) {
        //Check correct number of layers and folder exists
        layerNames.forEach((layerName) => {
            if (!(0, node_fs_1.existsSync)(path_1.default.join(dir, layerName))) {
                throw `Missing layer: ${layerName}`;
            }
        });
        if (!(0, node_fs_1.existsSync)(dir)) {
            throw new Error('Folder not there');
        }
        //Return layer promise
        const layersPromise = new Promise(function (resolve, reject) {
            const layers = layerNames.map((layerName) => ({
                filename: layerName,
                gerber: (0, node_fs_1.createReadStream)(path_1.default.join(dir, layerName)),
            }));
            if (layers.length === layerNames.length) {
                resolve(layers);
            }
            else {
                reject('Invalid layer count');
            }
        });
        return layersPromise;
    }
    //Clean up the archive folder in the specified directory
    static cleanupFiles(dir) {
        try {
            const folder = path_1.default.join(dir, 'archive');
            (0, fs_extra_1.emptyDirSync)(folder);
        }
        catch (error) {
            if (error instanceof Error) {
                console.error(error.message);
            }
        }
    }
    //  * Take an archive containing gerber files, config object, temporary dir
    //  * and output dir and create a PNG image from the gerber in the output dir
    //  * @param {string} gerber Path to an archive file containing gerber
    //  * @returns {Promise.<string>} Promise to return path to image
    gerberToImage(gerber) {
        // Create output dir if it doesn't exist
        try {
            (0, fs_extra_1.ensureDirSync)(this.folderConfig.imgDir);
        }
        catch (error) {
            if (error instanceof Error) {
                console.error(error.message);
            }
        }
        // Check temp and output dirs exist
        if (!(0, node_fs_1.existsSync)(gerber)) {
            throw Error('Archive does not exist.');
        }
        if (!(0, node_fs_1.existsSync)(this.folderConfig.tmpDir)) {
            throw Error('Temporary folder does not exist.');
        }
        if (!(0, node_fs_1.existsSync)(this.folderConfig.imgDir)) {
            throw Error('Output folder does not exist.');
        }
        else {
            console.error(`output dir: ${this.folderConfig.imgDir}`);
        }
        // Set filenames
        //Use the filename of the gerber zip to determine the output png filename
        const imageName = path_1.default.basename(gerber, '.zip');
        const destFile = `${path_1.default.join(this.folderConfig.imgDir, imageName)}.png`;
        return new Promise((resolve, reject) => {
            if (!this.layerNames) {
                throw new Error('You must supply an array of layer names.');
            }
            this.extractArchive(gerber, this.folderConfig.tmpDir);
            this.getLayers(path_1.default.join(this.folderConfig.tmpDir, 'archive'), this.layerNames)
                .then(pcb_stackup_1.default)
                .then((stackup) => {
                (0, sharp_1.default)(Buffer.from(stackup.top.svg), {
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
    gerberToStream(gerber) {
        // Check temp and output dirs exist
        if (!(0, node_fs_1.existsSync)(gerber)) {
            throw Error('Archive does not exist.');
        }
        if (!(0, node_fs_1.existsSync)(this.folderConfig.tmpDir)) {
            throw Error('Temporary folder does not exist.');
        }
        if (!(0, node_fs_1.existsSync)(this.folderConfig.imgDir)) {
            throw Error('Output folder does not exist.');
        }
        return new Promise((resolve, reject) => {
            this.extractArchive(gerber, this.folderConfig.tmpDir);
            if (!this.layerNames)
                throw new Error('No layers provided');
            this.getLayers(path_1.default.join(this.folderConfig.tmpDir, 'archive'), this.layerNames)
                .then(pcb_stackup_1.default)
                .then((stackup) => {
                (0, sharp_1.default)(Buffer.from(stackup.top.svg), {
                    density: this.imgConfig.density,
                })
                    .resize({ width: this.imgConfig.resizeWidth })
                    .png({ compressionLevel: this.imgConfig.compLevel })
                    .toBuffer()
                    .then((buffer) => {
                    ImageGenerator.cleanupFiles(this.folderConfig.tmpDir);
                    const stream = new node_stream_1.Readable();
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
exports.ImageGenerator = ImageGenerator;
