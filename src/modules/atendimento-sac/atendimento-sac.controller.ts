import { UsuarioSacGuard } from './usuario-sac.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AtendimentoSacService, UsuarioSac } from './atendimento-sac.service';
import {
  AnexoSacDto,
  AvaliarSacDto,
  ClassificarSacDto,
  DirecionarSacDto,
  FiltroSacDto,
  ObservacaoSacDto,
  PlanoAcaoSacDto,
  RncSacDto,
} from './dto/dados-sac.dto';
@Controller('atendimento-sac')
@UseGuards(JwtAuthGuard, UsuarioSacGuard)
export class AtendimentoSacController {
  constructor(private readonly sac: AtendimentoSacService) {}
  @Get() listar(@CurrentUser() u: UsuarioSac, @Query() q: FiltroSacDto) {
    return this.sac.listar(u, q);
  }
  @Get('participantes') participantes(@CurrentUser() u: UsuarioSac) {
    return this.sac.participantes(u);
  }
  @Get('minhas-acoes') acoes(@CurrentUser() u: UsuarioSac) {
    return this.sac.minhasAcoes(u);
  }
  @Get('minhas-acoes/:id') acao(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sac.minhaAcao(u, id);
  }
  @Get(':id') detalhe(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sac.detalhe(u, id);
  }
  @Get(':id/historico') historico(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sac.historico(u, id);
  }
  @Get(':id/tarefas') tarefas(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sac.tarefas(u, id);
  }
  @Post(':id/direcionar') direcionar(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: DirecionarSacDto,
  ) {
    return this.sac.direcionar(u, id, d);
  }
  @Post(':id/iniciar') iniciar(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sac.iniciar(u, id);
  }
  @Post(':id/classificar') classificar(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ClassificarSacDto,
  ) {
    return this.sac.classificar(u, id, d);
  }
  @Post(':id/acao/iniciar') iniciarAcao(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: PlanoAcaoSacDto,
  ) {
    return this.sac.plano(u, id, d, false);
  }
  @Put(':id/acao') salvarAcao(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: PlanoAcaoSacDto,
  ) {
    return this.sac.plano(u, id, d, false);
  }
  @Post(':id/acao/concluir') concluirAcao(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: PlanoAcaoSacDto,
  ) {
    return this.sac.plano(u, id, d, true);
  }
  @Post(':id/rnc') rnc(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: RncSacDto,
  ) {
    return this.sac.registrarRnc(u, id, d);
  }
  @Post(':id/avaliar') avaliar(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AvaliarSacDto,
  ) {
    return this.sac.avaliar(u, id, d);
  }
  @Post(':id/reabrir') reabrir(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ObservacaoSacDto,
  ) {
    return this.sac.reabrir(u, id, d);
  }
  @Post(':id/observacoes') observar(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ObservacaoSacDto,
  ) {
    return this.sac.observar(u, id, d);
  }
  @Post(':id/anexos')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, fields: 3, fieldSize: 5000 },
    }),
  )
  anexar(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AnexoSacDto,
    @UploadedFile() f: Express.Multer.File,
  ) {
    return this.sac.anexar(u, id, d, f);
  }
  @Get(':id/anexos/:anexoId')
  async baixar(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('anexoId', ParseUUIDPipe) anexoId: string,
    @Res() res: Response,
  ) {
    const a = await this.sac.baixar(u, id, anexoId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', a.tipo);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="anexo"; filename*=UTF-8''${encodeURIComponent(a.nome)}`,
    );
    res.send(a.conteudo);
  }
}
