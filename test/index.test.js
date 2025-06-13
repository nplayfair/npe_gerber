/* eslint-disable */
const path = require('path');
const fs = require('fs-extra');
const Readable = require('stream').Readable;
const { ImageGenerator } = require('../index.js');
require('../index.js');

const testGerber = path.join(__dirname, 'Arduino-Pro-Mini.zip');
const incompleteGerber = path.join(__dirname, 'incomplete.zip');
const testLayers = path.join(__dirname, 'layers');
const emptyFolder = path.join(__dirname, 'layers', 'Empty');
const folderConfig = {
  tmpDir: path.join(__dirname, 'tmp'),
  imgDir: path.join(__dirname, 'tmp'),
};
const noTempConfig = {
  tmpDir: emptyFolder,
  imgDir: path.join(__dirname, 'tmp'),
};
const tmpNotExist = {
  tmpDir: path.join(__dirname, 'InvalidFolderName'),
  imgDir: path.join(__dirname, 'tmp'),
};
const imgNotExist = {
  tmpDir: path.join(__dirname, 'tmp'),
  imgDir: path.join(__dirname, 'InvalidFolderName'),
};
const tmpBadPerms = {
  tmpDir: path.join(__dirname, 'badPerms'),
  imgDir: path.join(__dirname, 'tmp'),
};
const imgBadPerms = {
  tmpDir: path.join(__dirname, 'tmp'),
  imgDir: path.join(__dirname, 'badPerms'),
};
const noImageConfig = {
  tmpDir: path.join(__dirname, 'tmp'),
  imgDir: emptyFolder,
};
const imgConfig = {
  resizeWidth: 600,
  density: 1000,
  compLevel: 1,
};
const layerNames = [
  'CAMOutputs/DrillFiles/drills.xln',
  'CAMOutputs/GerberFiles/copper_top.gbr',
  'CAMOutputs/GerberFiles/silkscreen_top.gbr',
  'CAMOutputs/GerberFiles/soldermask_top.gbr',
  'CAMOutputs/GerberFiles/solderpaste_top.gbr',
  'CAMOutputs/GerberFiles/profile.gbr',
];

const fileProc = new ImageGenerator(folderConfig, imgConfig, layerNames);
const fileProcNoTemp = new ImageGenerator(noTempConfig, imgConfig, layerNames);
const fileProcNoImage = new ImageGenerator(
  noImageConfig,
  imgConfig,
  layerNames,
);

/**************
 * Tests
 ***************/

// Test constructor
describe('Creating an ImageGenerator object', () => {
  const imgGen = new ImageGenerator(folderConfig, imgConfig);
  test('should create a valid object when passed the correct files and configuration', () => {
    expect(imgGen).toBeInstanceOf(ImageGenerator);
  });
  // Image processing configuration
  test('image width should be 600', () => {
    expect(imgGen.imgConfig.resizeWidth).toBe(600);
  });
  test('image density should be 1000', () => {
    expect(imgGen.imgConfig.density).toBe(1000);
  });
  test('image compression level should be 1', () => {
    expect(imgGen.imgConfig.compLevel).toBe(1);
  });
  test('folders should be the ones specified in the folder config parameter', () => {
    expect(imgGen.tmpDir).toBe(path.join(__dirname, 'tmp'));
    expect(imgGen.imgDir).toBe(path.join(__dirname, 'tmp'));
  });
});

// Testing folder config
describe('Passing in', () => {
  test('a non-existent tmp folder should throw error', () => {
    expect(() => {
      new ImageGenerator(tmpNotExist, imgConfig);
    }).toThrow();
  });
  test('a tmp folder with invalid permissions should throw error', () => {
    expect(() => {
      new ImageGenerator(tmpBadPerms, imgConfig);
    }).toThrow();
  });
  test('a non-existent img folder should throw error', () => {
    expect(() => {
      new ImageGenerator(imgNotExist, imgConfig);
    }).toThrow();
  });
  test('an img folder with invalid permissions should throw error', () => {
    expect(() => {
      new ImageGenerator(imgBadPerms, imgConfig);
    }).toThrow();
  });
});

// Testing static methods
describe('Getting layers', () => {
  test('should return a promise of array layers', () => {
    expect.assertions(1);
    return ImageGenerator.getLayers(testLayers, layerNames).then((data) => {
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            filename: expect.any(String),
            gerber: expect.any(fs.ReadStream),
          }),
        ]),
      );
    });
  });
  test('should reject promise with error if the layers folder is not valid', () => {
    expect.assertions(1);
    return expect(
      ImageGenerator.getLayers('./invalid_folder', layerNames),
    ).rejects.toThrow(new Error('Layers folder does not exist.'));
  });
  test('should reject promise with error if there is not the correct number of layers', () => {
    expect.assertions(1);
    return expect(
      ImageGenerator.getLayers(emptyFolder, layerNames),
    ).rejects.toThrow(new Error('Layer not found.'));
  });
});

describe('When extracting an archive', () => {
  test('a non-existent archive should throw an error', () => {
    expect(() =>
      ImageGenerator.extractArchive(
        'invalid.zip',
        folderConfig.tmpDir,
      ).toThrow(),
    );
  });
  test('if the temp dir does not exist it should throw an error', () => {
    expect(() =>
      ImageGenerator.extractArchive(testGerber, './invalid_dir').toThrow(Error),
    );
  });
  test('it should extract archive and resolve with the number of files extracted', () => {
    expect(() =>
      ImageGenerator.extractArchive(testGerber, folderConfig.tmpDir).toBe(12),
    );
  });
});

// Gerber methods
describe('Converting a gerber to an image', () => {
  test('temp dir not existing should throw an error', () => {
    expect(() =>
      fileProcNoTemp
        .gerberToImage(testGerber)
        .toThrow(new Error('Temporary folder does not exist.')),
    );
  });
  test('output dir not existing should throw an error', () => {
    expect(() =>
      fileProcNoImage
        .gerberToImage(testGerber)
        .toThrow(new Error('Output folder does not exist.')),
    );
  });
  test('invalid archive file should throw an error', () => {
    expect(() =>
      fileProc
        .gerberToImage('invalid.zip')
        .toThrow(new Error('Archive does not exist.')),
    );
  });
  test('an archive with incomplete set of layers should throw an error', () => {
    expect(() => fileProc.gerberToImage(incompleteGerber).toThrow(Error));
  });
  test('gerber archive should resolve promise and return a filename of an image', () => {
    expect.assertions(1);
    return expect(fileProc.gerberToImage(testGerber)).resolves.toEqual(
      expect.stringContaining('Arduino-Pro-Mini.png'),
    );
  });
  test('Gerber archive should resolve promise and return a png stream', () => {
    expect.assertions(1);
    return expect(fileProc.gerberToStream(testGerber)).resolves.toBeInstanceOf(
      Readable,
    );
  });
});
