/* eslint-disable */ 
const path = require('path');
const fs = require('fs-extra');
const fileProc = require('../index.js');

const testGerber = path.join(__dirname, 'Arduino-Pro-Mini.zip');
const testLayers = path.join(__dirname, 'layers');
const emptyFolder = path.join(__dirname, 'layers', 'Empty');
const tmpDir = path.join(__dirname, 'tmp');

// getLayers
test('Promise of an array of layers from a given folder', () => {
  return fileProc.getLayers(testLayers).then(data => {
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filename: expect.any(String),
          gerber: expect.any(fs.ReadStream),
        })
      ])
    );
  });
});

test('Non-existent folder should reject promise with error', () => {
  return expect(fileProc.getLayers('./invalid_folder')).rejects.toThrow('Layers folder does not exist.');
});

test('Folder with incorrect number of layers should reject promise with error', () => {
  return expect(fileProc.getLayers(emptyFolder)).rejects.toThrow('Layer not found.');
});

// extractArchive
test('Non-existent archive should throw an error', () => {
  expect(() => fileProc.extractArchive('invalid.zip', tmpDir).toThrow(Error));
});

test('Temp dir not existing should throw an error', () => {
  expect(() => fileProc.extractArchive(testGerber, './invalid_dir').toThrow(Error));
});

test('Should extract archive and resolve with the number of files extracted', () => {
  expect(() => (fileProc.extractArchive(testGerber, tmpDir).toBe(12)));
});