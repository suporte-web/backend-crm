import type { NextFunction, Request, Response } from 'express';
import { posix } from 'path';

export function blockPrivateClientUploads(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  let pathname: string;
  try {
    pathname = posix
      .normalize(decodeURIComponent(req.path).replace(/\\/g, '/'))
      .toLowerCase();
  } catch {
    res.status(400).json({ message: 'Caminho inválido.' });
    return;
  }
  if (
    pathname === '/profile-photos' ||
    pathname.startsWith('/profile-photos/') ||
    pathname === '/client-documents' ||
    pathname.startsWith('/client-documents/')
  ) {
    res
      .status(403)
      .json({
        message:
          'Use a rota autenticada para acessar este arquivo privado.',
      });
    return;
  }
  next();
}
