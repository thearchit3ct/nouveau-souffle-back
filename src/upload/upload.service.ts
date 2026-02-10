import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(private readonly config: ConfigService) {
    const minioEndpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const minioPort = this.config.get<string>('MINIO_PORT', '9000');
    const useSsl = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const protocol = useSsl ? 'https' : 'http';

    this.endpoint = `${protocol}://${minioEndpoint}${minioPort !== '443' && minioPort !== '80' ? ':' + minioPort : ''}`;
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'nouveau-souffle');

    this.s3 = new S3Client({
      endpoint: this.endpoint,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY', ''),
        secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY', ''),
      },
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string) {
    const key = `${folder}/${randomUUID()}-${file.originalname}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      url: `${this.endpoint}/${this.bucket}/${key}`,
      key,
    };
  }

  async deleteFile(key: string) {
    if (!key) throw new BadRequestException('File key is required');

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    return { deleted: true };
  }

  async getPresignedUrl(key: string, expiresIn = 3600) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn });
    return { url, expiresIn };
  }

  async getDownloadUrl(key: string, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn });
    return { url, expiresIn };
  }

  async uploadBuffer(buffer: Buffer, key: string, contentType: string) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return {
      url: `${this.endpoint}/${this.bucket}/${key}`,
      key,
    };
  }
}
