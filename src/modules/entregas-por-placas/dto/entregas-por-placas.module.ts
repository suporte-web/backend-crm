import { Module } from '@nestjs/common';

import { DeliveriesModule } from '../../deliveries/deliveries.module';
import { EntregasPorPlacasController } from './entregas-por-placas.controller';
import { EntregasPorPlacasService } from './entregas-por-placas.service';


@Module({
  imports: [DeliveriesModule,
  
    
  ],
  controllers: [EntregasPorPlacasController,

  ],
  providers: [EntregasPorPlacasService,
    EntregasPorPlacasService,
  ],

})

export class EntregasPorPlacasModule {}