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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AtendimentoSacService } from './atendimento-sac.service';
import type { UsuarioSac } from './atendimento-sac.service';
import {
  AnexoSacDto,
  AvaliarSacDto,
  ClassificarSacDto,
  DirecionarSacDto,
  FiltroSacDto,
  ObservacaoSacDto,
  PlanoAcaoSacDto,
  RncSacDto,
} from './dtos/dados-sac.dto';
@ApiTags('Atendimento SAC')
@ApiBearerAuth()
@ApiExtraModels(AnexoSacDto)
@ApiUnauthorizedResponse({
  description: 'Token JWT ausente, inválido ou expirado.',
})
@ApiForbiddenResponse({
  description:
    'Usuário inativo ou sem permissão para esta operação ou registro.',
})
@Controller('atendimento-sac')
@UseGuards(JwtAuthGuard, UsuarioSacGuard)
export class AtendimentoSacController {
  constructor(private readonly sac: AtendimentoSacService) {}
  @ApiOperation({ summary: 'Listar atendimentos do SAC com filtros' })
  @Get()
  listar(@CurrentUser() u: UsuarioSac, @Query() q: FiltroSacDto) {
    return this.sac.listar(u, q);
  }
  @ApiOperation({
    summary: 'Consultar participantes disponíveis para o atendimento',
  })
  @Get('participantes')
  participantes(@CurrentUser() u: UsuarioSac) {
    return this.sac.participantes(u);
  }
  @ApiOperation({ summary: 'Listar ações atribuídas ao usuário autenticado' })
  @Get('minhas-acoes')
  acoes(@CurrentUser() u: UsuarioSac) {
    return this.sac.minhasAcoes(u);
  }
  @ApiOperation({ summary: 'Consultar uma ação atribuída ao usuário' })
  @Get('minhas-acoes/:id')
  acao(@CurrentUser() u: UsuarioSac, @Param('id', ParseUUIDPipe) id: string) {
    return this.sac.minhaAcao(u, id);
  }
  @ApiOperation({ summary: 'Consultar os detalhes de um atendimento' })
  @Get(':id')
  detalhe(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sac.detalhe(u, id);
  }
  @ApiOperation({ summary: 'Consultar o histórico do atendimento' })
  @Get(':id/historico')
  historico(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sac.historico(u, id);
  }
  @ApiOperation({ summary: 'Consultar as tarefas do atendimento' })
  @Get(':id/tarefas')
  tarefas(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sac.tarefas(u, id);
  }
  @ApiOperation({ summary: 'Atribuir o atendimento a um atendente' })
  @Post(':id/direcionar')
  direcionar(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: DirecionarSacDto,
  ) {
    return this.sac.direcionar(u, id, d);
  }
  @ApiOperation({ summary: 'Iniciar o atendimento' })
  @Post(':id/iniciar')
  iniciar(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sac.iniciar(u, id);
  }
  @ApiOperation({
    summary: 'Classificar a manifestação e definir o responsável pela ação',
  })
  @Post(':id/classificar')
  classificar(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ClassificarSacDto,
  ) {
    return this.sac.classificar(u, id, d);
  }
  @ApiOperation({ summary: 'Registrar o início do plano de ação' })
  @Post(':id/acao/iniciar')
  iniciarAcao(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: PlanoAcaoSacDto,
  ) {
    return this.sac.plano(u, id, d, false);
  }
  @ApiOperation({ summary: 'Salvar o plano de ação' })
  @Put(':id/acao')
  salvarAcao(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: PlanoAcaoSacDto,
  ) {
    return this.sac.plano(u, id, d, false);
  }
  @ApiOperation({ summary: 'Concluir a ação corretiva' })
  @Post(':id/acao/concluir')
  concluirAcao(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: PlanoAcaoSacDto,
  ) {
    return this.sac.plano(u, id, d, true);
  }
  @ApiOperation({ summary: 'Registrar informações de não conformidade' })
  @Post(':id/rnc')
  rnc(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: RncSacDto,
  ) {
    return this.sac.registrarRnc(u, id, d);
  }
  @ApiOperation({ summary: 'Avaliar a conclusão da ação' })
  @Post(':id/avaliar')
  avaliar(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AvaliarSacDto,
  ) {
    return this.sac.avaliar(u, id, d);
  }
  @ApiOperation({ summary: 'Reabrir o atendimento com uma observação' })
  @Post(':id/reabrir')
  reabrir(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ObservacaoSacDto,
  ) {
    return this.sac.reabrir(u, id, d);
  }
  @ApiOperation({ summary: 'Adicionar uma observação ao atendimento' })
  @Post(':id/observacoes')
  observar(
    @CurrentUser() u: UsuarioSac,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ObservacaoSacDto,
  ) {
    return this.sac.observar(u, id, d);
  }
  @ApiOperation({ summary: 'Anexar um arquivo ao atendimento' })
  @Post(':id/anexos')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(AnexoSacDto) },
        {
          type: 'object',
          required: ['arquivo'],
          properties: {
            arquivo: {
              type: 'string',
              format: 'binary',
              description: 'Arquivo de até 10 MB.',
            },
          },
        },
      ],
    },
  })
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
  @ApiOperation({ summary: 'Baixar um anexo autorizado do atendimento' })
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
