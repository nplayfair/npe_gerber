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
const noImageConfig = {
  tmpDir: path.join(__dirname, 'tmp'),
  imgDir: emptyFolder,
};
const imgConfig = {
  resizeWidth: 600,
  density: 1000,
  compLevel: 1,
};

const fileProc = new ImageGenerator(folderConfig, imgConfig);
const fileProcNoTemp = new ImageGenerator(noTempConfig, imgConfig);
const fileProcNoImage = new ImageGenerator(noImageConfig, imgConfig);

/**************
 * Tests
 ***************/

// getLayers
test('Promise of an array of layers from a given folder', () => {
  expect.assertions(1);
  return ImageGenerator.getLayers(testLayers).then((data) => {
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filename: expect.any(String),
          gerber: expect.any(fs.ReadStream),
        }),
      ])
    );
  });
});

test('Non-existent folder should reject promise with error', () => {
  expect.assertions(1);
  return expect(ImageGenerator.getLayers('./invalid_folder')).rejects.toThrow(
    new Error('Layers folder does not exist.')
  );
});

test('Folder with incorrect number of layers should reject promise with error', () => {
  expect.assertions(1);
  return expect(ImageGenerator.getLayers(emptyFolder)).rejects.toThrow(
    new Error('Layer not found.')
  );
});

// extractArchive
test('Non-existent archive should throw an error', () => {
  expect(() =>
    ImageGenerator.extractArchive('invalid.zip', folderConfig.tmpDir).toThrow(Error)
  );
});

test('Temp dir not existing should throw an error', () => {
  expect(() =>
    ImageGenerator.extractArchive(testGerber, './invalid_dir').toThrow(Error)
  );
});

test('Should extract archive and resolve with the number of files extracted', () => {
  expect(() => ImageGenerator.extractArchive(testGerber, folderConfig.tmpDir).toBe(12));
});

// gerberToImage
test('Temp dir not existing should throw an error', () => {
  expect(() =>
    fileProcNoTemp
      .gerberToImage(testGerber)
      .toThrow(new Error('Temporary folder does not exist.'))
  );
});

test('Output dir not existing should throw an error', () => {
  expect(() =>
    fileProcNoImage
      .gerberToImage(testGerber)
      .toThrow(new Error('Output folder does not exist.'))
  );
});

test('Invalid archive file should throw an error', () => {
  expect(() =>
    fileProc
      .gerberToImage('invalid.zip')
      .toThrow(new Error('Archive does not exist.'))
  );
});

test('Archive with incomplete set of layers should throw an error', () => {
  expect(() =>
    fileProc
      .gerberToImage(incompleteGerber)
      .toThrow(Error)
  );
});

test('Gerber archive should resolve promise and return a filename of an image', () => {
  expect.assertions(1);
  return expect(
    fileProc.gerberToImage(testGerber)
  ).resolves.toEqual(expect.stringContaining('Arduino-Pro-Mini.png'));
});

// gerberToStream
test('Gerber archive should resolve promise and return a png stream', () => {
  expect.assertions(1);
  return expect(
    fileProc.gerberToStream(testGerber)
  ).resolves.toBeInstanceOf(Readable);
});
