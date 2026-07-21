import { Controller, Get, Query } from '@nestjs/common';
import { UtilidadesService } from './utilidades.service';

@Controller('utilidades')
export class UtilidadesController {
    constructor(private readonly utilidadesService: UtilidadesService) { }

    @Get('statistics')
    getStatistics(
        @Query('year') year?: string
    ) {
        const queryYear = year || new Date().getFullYear().toString();
        return this.utilidadesService.getStatistics(queryYear);
    }
}
