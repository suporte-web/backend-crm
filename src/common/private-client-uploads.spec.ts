import express from 'express';
import request from 'supertest';

describe('Anexos de propostas não usam entrega pública', () => {
  it.each([
    '/uploads/client-documents/proposta.pdf',
    '/api/uploads/client-documents/proposta.pdf',
    '/uploads/%63lient-documents/proposta.pdf',
    '/uploads/CLIENT-DOCUMENTS/proposta.pdf',
    '/uploads/other/../client-documents/proposta.pdf',
  ])('bloqueia %s mesmo com o nome exato do arquivo', async (url) => {
    const { blockPrivateClientUploads } = require('./private-client-uploads');
    const app = express();
    app.use(
      ['/uploads', '/api/uploads'],
      blockPrivateClientUploads,
      (_req, res) => res.send('CONTEUDO PRIVADO'),
    );
    const response = await request(app).get(url);
    expect(response.status).toBe(403);
    expect(response.text).not.toContain('CONTEUDO PRIVADO');
  });
  it('preserva imagens públicas de outros módulos', async () => {
    const { blockPrivateClientUploads } = require('./private-client-uploads');
    const app = express();
    app.use('/uploads', blockPrivateClientUploads, (_req, res) =>
      res.send('imagem publica'),
    );
    expect(
      (await request(app).get('/uploads/portal-content/banner.png')).text,
    ).toBe('imagem publica');
  });
});
