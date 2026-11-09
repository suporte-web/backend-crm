import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SolicitacoesSiteController } from './solicitacoes-site.controller';
import { SolicitacoesSiteService } from './solicitacoes-site.service';
import { CotacaoSiteTriagemService } from './cotacao-site-triagem.service';
import { CotacaoSiteWorkflowService } from './cotacao-site-workflow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('Contratos HTTP do workflow de cotação',()=>{
 let app: INestApplication;
 const user={sub:'comercial',role:'COMERCIAL',email:'comercial@example.test'};
 const service={criar:jest.fn(async()=>({sucesso:true})),buscarPorId:jest.fn(),buscarAnexo:jest.fn()};
 const triagem={enriquecer:jest.fn(async (value:unknown)=>value),encaminhar:jest.fn(async()=>({sucesso:true,solicitacao:{etapaCotacao:'PROSPECT'}})),reprovar:jest.fn(),responsaveis:jest.fn(async()=>[])};
 const workflow={atualizar:jest.fn(async()=>({sucesso:true})),converterCliente:jest.fn(async()=>({sucesso:true,solicitacao:{etapaCotacao:'CLIENTE'}}))};
 beforeAll(async()=>{
  const module=await Test.createTestingModule({controllers:[SolicitacoesSiteController],providers:[
   {provide:SolicitacoesSiteService,useValue:service},{provide:CotacaoSiteTriagemService,useValue:triagem},{provide:CotacaoSiteWorkflowService,useValue:workflow},
  ]}).overrideGuard(JwtAuthGuard).useValue({canActivate:(ctx:ExecutionContext)=>{ctx.switchToHttp().getRequest<{user:typeof user}>().user=user;return true;}}).compile();
  app=module.createNestApplication();app.setGlobalPrefix('api');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));await app.init();
 });
 afterAll(async()=>{await app?.close();});
 beforeEach(()=>jest.clearAllMocks());
 it('mantém a rota pública de captura',async()=>{await request(app.getHttpServer()).post('/api/integracoes/site/solicitacoes').send({tipo:'COTACAO',nome:'Contato',email:'contato@example.test'}).expect(201);expect(service.criar).toHaveBeenCalled();});
 it('direcionamento existente continua usando triagem e valida responsável',async()=>{await request(app.getHttpServer()).post('/api/integracoes/site/solicitacoes/s1/direcionar').send({responsavelId:'00000000-0000-4000-8000-000000000001'}).expect(201);expect(triagem.encaminhar).toHaveBeenCalledWith(user,'s1',expect.objectContaining({responsavelId:'00000000-0000-4000-8000-000000000001'}));});
 it('PATCH prospect chama a qualificação do workflow',async()=>{await request(app.getHttpServer()).patch('/api/integracoes/site/solicitacoes/s1/prospect').send({empresa:'Empresa corrigida'}).expect(200);expect(workflow.atualizar).toHaveBeenCalledWith(user,'s1',expect.objectContaining({empresa:'Empresa corrigida'}));});
 it('POST converter-cliente chama conversão e rejeita payload vazio',async()=>{await request(app.getHttpServer()).post('/api/integracoes/site/solicitacoes/s1/converter-cliente').send({document:'00000000000191'}).expect(201);expect(workflow.converterCliente).toHaveBeenCalledWith(user,'s1',expect.objectContaining({document:'00000000000191'}));await request(app.getHttpServer()).post('/api/integracoes/site/solicitacoes/s1/converter-cliente').send({}).expect(400);expect(workflow.converterCliente).toHaveBeenCalledTimes(1);});
});
