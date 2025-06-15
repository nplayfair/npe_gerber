interface ImageConfig {
  resizeWidth: number;
  density: number;
  compLevel: number;
}

interface FolderConfig {
  tmpDir: string;
  imgDir: string;
}

interface ZipExtractor {
  extractArchive(fileName: string, tmpDir: string): number;
}

interface Layers {
  filename: string;
  gerber: ReadStream;
}

interface LayerGenerator {
  getLayers(dir: string, layerNames: string[]): Promise<Layers[]>;
}
