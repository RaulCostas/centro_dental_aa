import { Controller, Get, Query } from '@nestjs/common';
import { PacientesDeudoresService } from './pacientes_deudores.service';

@Controller('pacientes-deudores')
export class PacientesDeudoresController {
    constructor(private readonly pacientesDeudoresService: PacientesDeudoresService) { }

    @Get('pasivos')
    getPasivos() {
        return this.pacientesDeudoresService.findAll('terminado');
    }

    @Get('activos')
    getActivos() {
        return this.pacientesDeudoresService.findAll('no terminado');
    }
}
