import { Module } from '@nestjs/common';

import { DeliveriesModule } from '../../deliveries/deliveries.module';
import { EntregasPorPlacasController } from './entregas-por-placas.controller';
import { EntregasPorPlacasService } from './entregas-por-placas.service';
import { TesteManifestoSswModule } from '../../../teste-manifesto-ssw/teste-manifesto-ssw.module';

@Module({
  imports: [DeliveriesModule,
    TesteManifestoSswModule,
    
  ],
  controllers: [EntregasPorPlacasController,

  ],
  providers: [EntregasPorPlacasService,
    EntregasPorPlacasService,
  ],

})

export class EntregasPorPlacasModule {}