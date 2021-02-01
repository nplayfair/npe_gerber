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
  return fileProc.getLayers2(testLayers).then(data => {
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
  return expect(fileProc.getLayers2('./invalid_folder')).rejects.toThrow('Layers folder does not exist.');
});

test('Folder with incorrect number of layers should reject promise with error', () => {
  return expect(fileProc.getLayers2(emptyFolder)).rejects.toThrow('Layer not found.');
});
