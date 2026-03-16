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
