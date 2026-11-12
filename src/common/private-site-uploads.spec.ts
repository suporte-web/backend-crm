import express from 'express';
import request from 'supertest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { tmpdir } from 'os';
import { blockPrivateSiteUploads } from './private-site-uploads';

describe('documentos privados em armazenamento legado', () => {
  let directory: string;
  let app: express.Express;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'crm-private-site-'));
    await mkdir(join(directory, 'solicitacoes-site'));
    await writeFile(join(directory, 'solicitacoes-site', 'documento.pdf'), 'DOCUMENTO PRIVADO');
    await writeFile(join(directory, 'publico.txt'), 'PUBLICO');
    app = express();
    app.use(['/uploads', '/api/uploads'], blockPrivateSiteUploads, express.static(directory));
  });
  afterAll(async () => {
    if (!directory) return;
    if (!resolve(directory).startsWith(resolve(tmpdir()) + sep) || !directory.includes('crm-private-site-')) throw new Error('Caminho temporário inválido');
    await rm(directory, { recursive: true, force: true });
  });
  it.each(['/uploads/solicitacoes-site/documento.pdf', '/api/uploads/solicitacoes-site/documento.pdf',
    '/api/uploads/%73olicitacoes-site/documento.pdf', '/uploads/SOLICITACOES-SITE/documento.pdf',
    '/uploads/other/../solicitacoes-site/documento.pdf'])('não permite acesso público por %s', async (url) => {
    const response = await request(app).get(url);
    expect(response.status).toBe(403);
    expect(response.text).not.toContain('DOCUMENTO PRIVADO');
  });
  it('mantém arquivos públicos de outros módulos disponíveis', async () => {
    expect((await request(app).get('/api/uploads/publico.txt')).text).toBe('PUBLICO');
  });
});
