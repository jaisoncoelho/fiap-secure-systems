export const FILE_STORAGE = Symbol('FILE_STORAGE');

export interface StoredFile {
  path: string;
  filename: string;
}

export interface FileStoragePort {
  save(buffer: Buffer, originalName: string): Promise<StoredFile>;
}
