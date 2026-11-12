import type { NextFunction, Request, Response } from 'express';
import { posix } from 'path';

// Estes arquivos legados só podem ser entregues pela rota autenticada de anexos.
export function blockPrivateSiteUploads(req: Request, res: Response, next: NextFunction) {
  let pathname: string;
  try {
    pathname = posix.normalize(decodeURIComponent(req.path).replace(/\\/g, '/')).toLowerCase();
  } catch {
    res.status(400).json({ message: 'Caminho inválido.' });
    return;
  }
  if (pathname === '/solicitacoes-site' || pathname.startsWith('/solicitacoes-site/')) {
    res.status(403).json({ message: 'Use a rota autenticada para acessar os documentos da solicitação.' });
    return;
  }
  next();
}
