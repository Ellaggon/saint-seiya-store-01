import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ProductImageStorageService } from "../../domain/services/StorageService";

export class R2Storage implements ProductImageStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    this.bucket = requiredEnv(["R2_BUCKET_NAME", "R2_BUCKET"]);
    const endpoint = resolveR2Endpoint();
    this.publicUrl =
      normalizeUrl(
        process.env.R2_MEDIA_PUBLIC_URL ||
          process.env.R2_PUBLIC_URL ||
          process.env.R2_PUBLIC_BASE_URL ||
          "",
      ) ||
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

    return this.uploadAtKey(file, fileName);
  }

  async uploadAtKey(
    file: { data: Uint8Array; name: string; type: string },
    key: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.data,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    });

    await this.client.send(command);

    return this.publicUrlForKey(key);
  }

  async createPresignedUpload(input: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        ContentType: input.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
      { expiresIn: input.expiresInSeconds ?? 300 },
    );
  }

  async head(key: string): Promise<{
    contentType?: string;
    contentLength?: number;
    eTag?: string;
  }> {
    const object = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      contentType: object.ContentType,
      contentLength: object.ContentLength,
      eTag: object.ETag,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async listKeysByPrefix(prefix: string): Promise<string[]> {
    if (!prefix || prefix.includes("..")) {
      throw new Error("Invalid storage prefix");
    }

    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const object of page.Contents ?? []) {
        if (object.Key) keys.push(object.Key);
      }

      continuationToken = page.IsTruncated
        ? page.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return keys;
  }

  async deleteMany(keys: string[]): Promise<void> {
    const uniqueKeys = [...new Set(keys.filter((key) => key.trim().length > 0))];
    if (!uniqueKeys.length) return;

    for (let index = 0; index < uniqueKeys.length; index += 1000) {
      const chunk = uniqueKeys.slice(index, index + 1000);
      const result = await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: chunk.map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );

      if (result.Errors?.length) {
        throw new Error(
          `Failed to delete ${result.Errors.length} object(s) from R2: ${
            result.Errors[0]?.Key ?? "unknown"
          }`,
        );
      }
    }
  }

  publicUrlForKey(key: string): string {
    if (/^https?:\/\//.test(key) || key.startsWith("/")) return key;
    return `${this.publicUrl}/${key}`;
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
