import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportManualReportDto } from './dto/import-manual-report.dto';
import { metricsRange } from './dto/metrics-period.dto';
import { parseGa4Csv } from './ga4-csv';

const summarySelect = {
  id: true,
  title: true,
  propertyId: true,
  startDate: true,
  endDate: true,
  filename: true,
  rowCount: true,
  createdAt: true,
} as const;

@Injectable()
export class ManualReportsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.marketingManualReport.findMany({
      select: summarySelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }

  async find(id: string) {
    const report = await this.prisma.marketingManualReport.findUnique({
      where: { id },
      select: { ...summarySelect, data: true },
    });
    if (!report) throw new NotFoundException('Relatório não encontrado.');
    return report;
  }

  async import(
    dto: ImportManualReportDto,
    userId: string,
    file?: { buffer: Buffer; originalname: string },
  ) {
    if (!file || !/\.csv$/i.test(file.originalname))
      throw new BadRequestException(
        'Selecione um arquivo CSV exportado do GA4.',
      );
    if (file.buffer.length > 2 * 1024 * 1024)
      throw new BadRequestException('O CSV deve ter até 2 MB.');
    if (!dto.title.trim())
      throw new BadRequestException('Informe o nome do relatório.');
    const range = metricsRange({
      periodo: 'personalizado',
      inicio: dto.inicio,
      fim: dto.fim,
    });
    const data = parseGa4Csv(file.buffer.toString('utf8'));
    return this.prisma.marketingManualReport.create({
      data: {
        title: dto.title.trim(),
        propertyId: dto.propertyId,
        startDate: range.inicio,
        endDate: range.fim,
        filename: file.originalname.replace(/^.*[\\/]/, '').slice(0, 255),
        rowCount: data.rows.length,
        data,
        importedBy: userId,
      },
      select: { ...summarySelect, data: true },
    });
  }
}
