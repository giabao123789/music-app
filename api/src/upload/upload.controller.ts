import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadService } from "./upload.service";

@Controller("upload")
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post("audio")
  @UseInterceptors(FileInterceptor("file"))
  uploadAudio(@UploadedFile() file: Express.Multer.File) {
    const url = this.uploadService.saveFile(file, "audio");
    return { url };
  }

  @Post("image")
  @UseInterceptors(FileInterceptor("file"))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    const url = this.uploadService.saveFile(file, "image");
    return { url };
  }
}
