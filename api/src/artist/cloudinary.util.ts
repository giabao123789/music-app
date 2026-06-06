// api/src/cloudinary.util.ts
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: 'dbme7rkvz',
  api_key: '979655726741136',
  api_secret: 'TaHyLJeXu_4Y_1JVOc0BqRydEEk',
});

export function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'raw' = 'image',
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      },
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}
