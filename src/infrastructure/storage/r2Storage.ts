import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { StorageService } from "../../domain/services/StorageService";

export class R2Storage implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    this.bucket = requiredEnv(["R2_BUCKET_NAME", "R2_BUCKET"]);
    const endpoint = resolveR2Endpoint();
    this.publicUrl =
      normalizeUrl(process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL || "") ||
      `${endpoint}/${this.bucket}`;

    this.client = new S3Client({
      region: "auto",
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: requiredEnv(["R2_ACCESS_KEY_ID"]),
        secretAccessKey: requiredEnv(["R2_SECRET_ACCESS_KEY"]),
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
      CacheControl: "public, max-age=31536000, immutable",
    });

    await this.client.send(command);

    const baseUrl = this.publicUrl;
    return `${baseUrl}/${fileName}`;
  }
}

const requiredEnv = (names: string[]): string => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
};

const normalizeUrl = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const resolveR2Endpoint = (): string => {
  const configuredEndpoint = process.env.R2_ENDPOINT?.trim();
  if (configuredEndpoint) {
    return normalizeUrl(
      configuredEndpoint.startsWith("http")
        ? configuredEndpoint
        : `https://${configuredEndpoint}`,
    );
  }

  const accountId = requiredEnv(["R2_ACCOUNT_ID"])
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/\.r2\.cloudflarestorage\.com$/, "");

  return `https://${accountId}.r2.cloudflarestorage.com`;
};
