import path from 'path';
import { readdirSync } from 'node:fs';
import { emptyDirSync } from 'fs-extra';
import { Readable } from 'node:stream';
import { ImageGenerator } from '../src/index';

//Sample data
const arduinoGerber = path.join(__dirname, 'Arduino-Pro-Mini.zip');
const incompleteGerber = path.join(__dirname, 'incomplete.zip');

//Correct folder configuration
const folderConfig = {
  tmpDir: path.join(__dirname, 'tmp'),
  imgDir: path.join(__dirname, 'tmp'),
};
//Folder configuration with non-existent tmpDir
const tmpNotExist = {
  tmpDir: path.join(__dirname, 'InvalidFolderName'),
  imgDir: path.join(__dirname, 'tmp'),
};
//Folder configuration with non-existent imgDir
const imgNotExist = {
  tmpDir: path.join(__dirname, 'tmp'),
  imgDir: path.join(__dirname, 'InvalidFolderName'),
};
//Folder configuration with bad permissions on tmpDir
const tmpBadPerms = {
  tmpDir: path.join(__dirname, 'badPerms'),
  imgDir: path.join(__dirname, 'tmp'),
};
//Folder configuration with bad permissions on imgDir
const imgBadPerms = {
  tmpDir: path.join(__dirname, 'tmp'),
  imgDir: path.join(__dirname, 'badPerms'),
};
//Correct folder configuration
const arduinoConfig = {
  tmpDir: path.join(__dirname, 'tmp'),
  imgDir: path.join(__dirname, 'arduino'),
};

//Valid image configuration object
const imgConfig = {
  resizeWidth: 600,
  density: 1000,
  compLevel: 1,
};

//Valid array of layer names
const layerNames = [
  'CAMOutputs/DrillFiles/drills.xln',
  'CAMOutputs/GerberFiles/copper_top.gbr',
  'CAMOutputs/GerberFiles/silkscreen_top.gbr',
  'CAMOutputs/GerberFiles/soldermask_top.gbr',
  'CAMOutputs/GerberFiles/solderpaste_top.gbr',
  'CAMOutputs/GerberFiles/profile.gbr',
];

//===== Tests =====

//Setup
beforeAll(() => {
  return emptyDirSync(folderConfig.tmpDir);
});

// Test constructor
describe('Creating an ImageGenerator object', () => {
  const imgGen = new ImageGenerator(folderConfig, imgConfig, layerNames);
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
  test('Layers should match layerNames sample array', () => {
    expect(imgGen.layerNames).toBe(layerNames);
  });
  afterAll(() => {
    return emptyDirSync(folderConfig.tmpDir);
  });
});

//Test invalid folder configs
describe('Attempting to create ImageGenerator object with', () => {
  afterAll(() => {
    return emptyDirSync(path.join(__dirname, 'tmp'));
  });
  test('non-existent temp folder should throw error', () => {
    expect(() => {
      const badGen = new ImageGenerator(tmpNotExist, imgConfig, layerNames);
    }).toThrow();
  });
  test('non-existent image folder should throw error', () => {
    expect(() => {
      const badGen = new ImageGenerator(imgNotExist, imgConfig, layerNames);
    }).toThrow();
  });
  test('temp folder with bad permissions should throw error', () => {
    expect(() => {
      const badGen = new ImageGenerator(tmpBadPerms, imgConfig, layerNames);
    }).toThrow();
  });
  test('image folder with bad permissions should throw error', () => {
    expect(() => {
      const badGen = new ImageGenerator(imgBadPerms, imgConfig, layerNames);
    }).toThrow();
  });
});

//Create image from Arduino Gerber
describe('Create image from Arduino gerber', () => {
  beforeAll(() => {
    return emptyDirSync(path.join(__dirname, 'arduino'));
  });
  beforeEach(() => {
    return emptyDirSync(folderConfig.tmpDir);
  });
  const arduinoGen = new ImageGenerator(arduinoConfig, imgConfig, layerNames);
  test('should create a valid object when passed the correct files and configuration', () => {
    expect(arduinoGen).toBeInstanceOf(ImageGenerator);
  });
  test('invalid archive file should throw an error', () => {
    expect(() => arduinoGen.gerberToImage('invalid.zip')).toThrow();
  });
  test('arduino archive should resolve promise and return a filename of an image', () => {
    expect.assertions(1);
    return expect(arduinoGen.gerberToImage(arduinoGerber)).resolves.toEqual(
      expect.stringContaining('Arduino-Pro-Mini.png'),
    );
  });
  test('arduino archive should resolve promise and return a png stream', () => {
    expect.assertions(1);
    return expect(
      arduinoGen.gerberToStream(arduinoGerber),
    ).resolves.toBeInstanceOf(Readable);
  });
  test('incomplete archive file should throw an error', () => {
    expect.assertions(1);
    return expect(arduinoGen.gerberToImage(incompleteGerber)).rejects.toContain(
      'Missing',
    );
  });
});
