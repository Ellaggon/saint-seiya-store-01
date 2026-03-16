import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { StorageService } from "../../domain/services/StorageService";

export class R2Storage implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    this.bucket = process.env.R2_BUCKET_NAME || "";
    this.publicUrl = process.env.R2_PUBLIC_URL || "";

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
  }

  async upload(
    file: {
      data: Uint8Array;
      name: string;
      type: string;
    },
    folder: string,
  ): Promise<string> {
    const extension = file.name.split(".").pop();
    const fileName = `${folder}/${crypto.randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileName,
      Body: file.data,
      ContentType: file.type,
    });

    await this.client.send(command);

    // Ensure publicUrl doesn't end with a slash to prevent double slashes
    const baseUrl = this.publicUrl.endsWith("/")
      ? this.publicUrl.slice(0, -1)
      : this.publicUrl;
    return `${baseUrl}/${fileName}`;
  }
}
