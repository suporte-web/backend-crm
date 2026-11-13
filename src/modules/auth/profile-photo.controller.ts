import { BadRequestException, Controller, Delete, Get, Header, Post, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthUser } from './types/auth-user.type';
import { MAX_PROFILE_PHOTO_BYTES, ProfilePhotoService } from './profile-photo.service';

@ApiTags('Autenticacao')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auth/profile-photo')
export class ProfilePhotoController {
  constructor(private readonly photos: ProfilePhotoService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async read(@CurrentUser() user: AuthUser) {
    const photo = await this.photos.read(user.sub);
    return new StreamableFile(photo, { type: 'image/jpeg', length: photo.length, disposition: 'inline' });
  }

  @Post()
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize: MAX_PROFILE_PHOTO_BYTES, files: 1 } }))
  save(@CurrentUser() user: AuthUser, @UploadedFile() photo?: Express.Multer.File) {
    if (!photo) throw new BadRequestException('Selecione uma foto de perfil.');
    return this.photos.save(user.sub, photo.buffer, photo.mimetype);
  }

  @Delete()
  remove(@CurrentUser() user: AuthUser) { return this.photos.remove(user.sub); }
}
