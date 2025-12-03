import { Injectable } from "@nestjs/common";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import * as path from "path";

@Injectable()
export class UploadService {
  saveFile(file: Express.Multer.File, folder: string) {
    const uploadPath = path.join(process.cwd(), "uploads", folder);

    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }

    const filename = Date.now() + "-" + file.originalname;
    const fullPath = path.join(uploadPath, filename);

    writeFileSync(fullPath, file.buffer);

    return `/uploads/${folder}/${filename}`;
  }
}
