export interface StorageService {
  upload(
    file: {
      data: Uint8Array;
      name: string;
      type: string;
    },
    folder: string,
  ): Promise<string>;
}

export interface ProductImageStorageService extends StorageService {
  uploadAtKey(
    file: { data: Uint8Array; name: string; type: string },
    key: string,
  ): Promise<string>;
  createPresignedUpload(input: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<string>;
  head(key: string): Promise<{
    contentType?: string;
    contentLength?: number;
    eTag?: string;
  }>;
  delete(key: string): Promise<void>;
  listKeysByPrefix(prefix: string): Promise<string[]>;
  deleteMany(keys: string[]): Promise<void>;
  publicUrlForKey(key: string): string;
}
