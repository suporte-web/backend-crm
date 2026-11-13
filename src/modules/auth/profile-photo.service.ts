import { BadRequestException, Injectable, Inject, NotFoundException, Optional } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;

@Injectable()
export class ProfilePhotoService {
  private readonly root: string;
  constructor(@Optional() @Inject('PROFILE_PHOTO_ROOT') root?: string) {
    this.root = root ?? join(process.cwd(), 'uploads', 'profile-photos');
  }
  private file(userId: string) {
    return join(this.root, createHash('sha256').update(userId).digest('hex') + '.jpg');
  }
  async read(userId: string): Promise<Buffer> {
    try { return await readFile(this.file(userId)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new NotFoundException('Nenhuma foto de perfil cadastrada.');
      throw error;
    }
  }
  async save(userId: string, data: Buffer, contentType: string) {
    if (contentType !== 'image/jpeg' || !data || data.length < 5 || data.length > MAX_PROFILE_PHOTO_BYTES ||
      data[0] !== 0xff || data[1] !== 0xd8 || data[2] !== 0xff || data[data.length - 2] !== 0xff || data[data.length - 1] !== 0xd9) {
      throw new BadRequestException('Envie uma foto JPEG válida de até 2 MB.');
    }
    await mkdir(this.root, { recursive: true });
    const temporary = join(this.root, randomUUID() + '.tmp');
    try {
      await writeFile(temporary, data, { flag: 'wx', mode: 0o600 });
      await rename(temporary, this.file(userId));
    } finally { await rm(temporary, { force: true }); }
    return { success: true };
  }
  async remove(userId: string) {
    await rm(this.file(userId), { force: true });
    return { success: true };
  }
}
