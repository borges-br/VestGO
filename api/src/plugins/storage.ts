import fp from 'fastify-plugin';
import { Client } from 'minio';

type UploadTarget = 'avatar' | 'cover' | 'gallery';

export type StoredAsset = {
  key: string;
  url: string;
  contentType: string;
  size: number;
};

type StorageService = {
  putImage: (input: {
    userId: string;
    target: UploadTarget;
    filename: string;
    contentType: string;
    buffer: Buffer;
  }) => Promise<StoredAsset>;
  getObject: (key: string) => Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    size: number;
  }>;
  buildPublicUrl: (key: string) => string;
};

declare module 'fastify' {
  interface FastifyInstance {
    storage: StorageService;
  }
}

function sanitizeFilename(value: string) {
  const sanitized = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return sanitized.slice(0, 80);
}

function getFileExtension(filename: string, contentType: string) {
  const parts = filename.split('.');
  const rawExtension = parts.length > 1 ? parts[parts.length - 1]?.toLowerCase() : '';

  if (rawExtension && ['jpg', 'jpeg', 'png', 'webp'].includes(rawExtension)) {
    return rawExtension === 'jpeg' ? 'jpg' : rawExtension;
  }

  if (contentType === 'image/png') {
    return 'png';
  }

  if (contentType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

function buildObjectKey(userId: string, target: UploadTarget, filename: string, contentType: string) {
  const sanitizedBase = sanitizeFilename(filename.replace(/\.[^.]+$/, '')) || target;
  const extension = getFileExtension(filename, contentType);
  const random = Math.random().toString(36).slice(2, 10);
  const targetGroup =
    target === 'avatar'
      ? 'profile-avatar'
      : target === 'cover'
        ? 'profile-cover'
        : 'profile-gallery';

  return `${userId}-${targetGroup}-${Date.now()}-${random}-${sanitizedBase}.${extension}`;
}

export default fp(async (fastify) => {
  const bucket = process.env.MINIO_BUCKET ?? 'vestgo-uploads';

  const client = new Client({
    endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: Number(process.env.MINIO_PORT ?? '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY ?? '',
    secretKey: process.env.MINIO_SECRET_KEY ?? '',
  });

  let bucketReadyPromise: Promise<void> | null = null;

  async function ensureBucket() {
    if (!bucketReadyPromise) {
      bucketReadyPromise = (async () => {
        const exists = await client.bucketExists(bucket);

        if (!exists) {
          await client.makeBucket(bucket);
        }
      })().catch((error) => {
        bucketReadyPromise = null;
        throw error;
      });
    }

    return bucketReadyPromise;
  }

  const storage: StorageService = {
    buildPublicUrl(key) {
      return `/api/backend/uploads/${encodeURIComponent(key)}`;
    },
    async putImage({ userId, target, filename, contentType, buffer }) {
      await ensureBucket();

      const key = buildObjectKey(userId, target, filename, contentType);

      await client.putObject(bucket, key, buffer, buffer.length, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'x-amz-meta-owner-id': userId,
        'x-amz-meta-upload-target': target,
      });

      return {
        key,
        url: storage.buildPublicUrl(key),
        contentType,
        size: buffer.length,
      };
    },
    async getObject(key) {
      await ensureBucket();

      const [stream, stat] = await Promise.all([
        client.getObject(bucket, key),
        client.statObject(bucket, key),
      ]);

      return {
        stream,
        contentType: stat.metaData['content-type'] ?? 'application/octet-stream',
        size: stat.size,
      };
    },
  };

  fastify.decorate('storage', storage);
});
