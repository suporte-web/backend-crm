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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsuarioSacGuard } from '../atendimento-sac/usuario-sac.guard';
import { VisitasService } from './visitas.service';
import type { UsuarioVisita } from './visitas.policy';
import {
  AnexoVisitaDto,
  AtualizarVisitaDto,
  CriarVisitaDto,
  FiltroVisitaDto,
  ParticipantesVisitaDto,
  PosVisitaDto,
  RealizarVisitaDto,
  ReagendarVisitaDto,
  ValidarVisitaDto,
} from './dto/dados-visita.dto';
@ApiTags('Visitas')
@ApiBearerAuth()
@Controller('visitas')
@UseGuards(JwtAuthGuard, UsuarioSacGuard)
export class VisitasController {
  constructor(private readonly visitas: VisitasService) {}
  @Get() listar(@CurrentUser() u: UsuarioVisita, @Query() d: FiltroVisitaDto) {
    return this.visitas.listar(u, d);
  }
  @Get('opcoes') opcoes(@CurrentUser() u: UsuarioVisita) {
    return this.visitas.opcoes(u);
  }
  @Post() criar(@CurrentUser() u: UsuarioVisita, @Body() d: CriarVisitaDto) {
    return this.visitas.criar(u, d);
  }
  @Get(':id') detalhe(
    @CurrentUser() u: UsuarioVisita,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.visitas.detalhe(u, id);
  }
  @Put(':id') atualizar(
    @CurrentUser() u: UsuarioVisita,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AtualizarVisitaDto,
  ) {
    return this.visitas.atualizar(u, id, d);
  }
  @Post(':id/iniciar') iniciar(
    @CurrentUser() u: UsuarioVisita,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.visitas.iniciar(u, id);
  }
  @Post(':id/realizar') realizar(
    @CurrentUser() u: UsuarioVisita,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: RealizarVisitaDto,
  ) {
    return this.visitas.realizar(u, id, d);
  }
  @Post(':id/reagendar') reagendar(
    @CurrentUser() u: UsuarioVisita,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ReagendarVisitaDto,
  ) {
    return this.visitas.reagendar(u, id, d);
  }
  @Post(':id/validar') validar(
    @CurrentUser() u: UsuarioVisita,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ValidarVisitaDto,
  ) {
    return this.visitas.validar(u, id, d);
  }
  @Post(':id/pos-visita') avaliar(
    @CurrentUser() u: UsuarioVisita,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: PosVisitaDto,
  ) {
    return this.visitas.posVisita(u, id, d);
  }
  @Post(':id/concluir') concluir(
    @CurrentUser() u: UsuarioVisita,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.visitas.concluir(u, id);
  }
  @Post(':id/participantes') participantes(
    @CurrentUser() u: UsuarioVisita,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ParticipantesVisitaDto,
  ) {
    return this.visitas.adicionarParticipantes(u, id, d.participantes);
  }
  @Get(':id/historico') historico(
    @CurrentUser() u: UsuarioVisita,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.visitas.historico(u, id);
  }
  @Post(':id/anexos')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, fields: 2, fieldSize: 5000 },
    }),
  )
  anexar(
    @CurrentUser() u: UsuarioVisita,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AnexoVisitaDto,
    @UploadedFile() f: Express.Multer.File,
  ) {
    return this.visitas.anexar(u, id, d, f);
  }
  @Get(':id/anexos/:anexoId')
  async baixar(
    @CurrentUser() u: UsuarioVisita,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('anexoId', ParseUUIDPipe) anexoId: string,
    @Res() res: Response,
  ) {
    const a = await this.visitas.baixar(u, id, anexoId);
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
