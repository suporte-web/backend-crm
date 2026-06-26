import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { TrackingsService } from './trackings.service';
import { TrackingQueryType } from './dto/query-tracking.dto';

describe('TrackingsService', () => {
  let service: TrackingsService;
  let httpService: { post: jest.Mock };

  beforeEach(async () => {
    httpService = {
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingsService,
        {
          provide: HttpService,
          useValue: httpService,
        },
      ],
    }).compile();

    service = module.get<TrackingsService>(TrackingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send form encoded payload and parse JSON response', async () => {
    httpService.post.mockReturnValue(
      of({
        status: 200,
        data: JSON.stringify({
          success: true,
          tracking: {
            items: {
              item: [{ ocorrencia: 'Entregue' }],
            },
          },
        }),
      }),
    );

    const result = await service.queryTracking({
      cnpj: '02.012.862/0037-70',
      tipoConsulta: TrackingQueryType.NRO_NF,
      valor: '123456',
    });

    expect(httpService.post).toHaveBeenCalledWith(
      'https://ssw.inf.br/api/trackingdest',
      'cnpj=02012862003770&nro_nf=123456',
      expect.objectContaining({
        responseType: 'text',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );
    expect(result).toEqual({
      success: true,
      tracking: {
        items: {
          item: [{ ocorrencia: 'Entregue' }],
        },
      },
    });
  });
});
