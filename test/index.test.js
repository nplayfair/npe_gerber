const path = require('path');
const { readdirSync, ReadStream } = require('node:fs');
const { Readable } = require('node:stream');
const { ImageGenerator } = require('../dist/index.js');
require('../dist/index.js');

const testGerber = path.join(__dirname, 'Arduino-Pro-Mini.zip');
const incompleteGerber = path.join(__dirname, 'incomplete.zip');
const testLayers = path.join(__dirname, 'layers');
const emptyFolder = path.join(__dirname, 'layers', 'Empty');
const archiveTestFolder = path.join(__dirname, 'archiveTest');
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
    expect(imgGen.folderConfig.tmpDir).toBe(path.join(__dirname, 'tmp'));
    expect(imgGen.folderConfig.imgDir).toBe(path.join(__dirname, 'tmp'));
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
//Layer methods
describe('Getting layers', () => {
  const imgGen = new ImageGenerator(folderConfig, imgConfig);
  test('should return an array of layers', () => {
    expect(imgGen.getLayers(testLayers, layerNames)).toBeInstanceOf(Array);
  });

  test('should throw error if the layers folder is not valid', () => {
    expect(() => {
      imgGen.getLayers('some_invalid_folder', layerNames);
    }).toThrow();
  });

  test('should throw error if incorrect number of layers supplied', () => {
    expect(() => {
      imgGen.getLayers(emptyFolder, layerNames);
    }).toThrow();
  });
});
//Archive methods
describe('When extracting an archive', () => {
  const imgGen = new ImageGenerator(folderConfig, imgConfig);
  test('a non-existent archive should throw an error', () => {
    expect(() =>
      imgGen.extractArchive('invalid.zip', folderConfig.tmpDir),
    ).toThrow();
  });
  test('if the temp dir does not exist it should throw an error', () => {
    expect(() => imgGen.extractArchive(testGerber, 'some_invalid_dir')).toThrow(
      Error,
    );
  });
  test('it should load the archive and return the number of files extracted', () => {
    expect(() => {
      imgGen.testArchive(testGerber, archiveTestFolder);
    }).not.toThrow();
    expect(imgGen.testArchive(testGerber, archiveTestFolder)).toEqual(12);
  });
  test('it should extract archive and all files should be present', () => {
    expect(imgGen.testArchive(testGerber, archiveTestFolder)).toEqual(12);
    imgGen.extractArchive(testGerber, archiveTestFolder);
    const dirents = readdirSync(archiveTestFolder, {
      recursive: true,
      withFileTypes: true,
    });
    const numOutputFiles = dirents.filter((dirent) => dirent.isFile());
    expect(numOutputFiles).toHaveLength(12);
  });
});

//Gerber methods
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
