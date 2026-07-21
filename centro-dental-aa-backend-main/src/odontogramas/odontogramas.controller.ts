import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { OdontogramasService } from './odontogramas.service';
import { CreateOdontogramaDto } from './dto/create-odontograma.dto';

@Controller('odontogramas')
export class OdontogramasController {
    constructor(private readonly odontogramasService: OdontogramasService) {}

    @Post()
    create(@Body() createDto: CreateOdontogramaDto) {
        return this.odontogramasService.create(createDto);
    }

    @Get('paciente/:id')
    findAllByPaciente(@Param('id') id: string) {
        return this.odontogramasService.findAllByPaciente(+id);
    }

    @Get('latest')
    findLatest(@Query('pacienteId') pacienteId?: string) {
        return this.odontogramasService.findLatestByPaciente(
            pacienteId ? +pacienteId : undefined
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.odontogramasService.findOne(+id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.odontogramasService.remove(+id);
    }
}
