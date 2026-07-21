import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PacientesService } from './pacientes.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';

@Controller('pacientes')
export class PacientesController {
    constructor(private readonly pacientesService: PacientesService) { }

    @Post()
    create(@Body() createPacienteDto: CreatePacienteDto) {
        return this.pacientesService.create(createPacienteDto);
    }


    @Get('pendientes')
    findPendientes(
        @Query('tab') tab: 'agendados' | 'no_agendados',
        @Query('search') search?: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10'
    ) {
        return this.pacientesService.findPendientes(tab, search, +page, +limit);
    }

    @Get('no-registrados')
    findNoRegistrados() {
        return this.pacientesService.findNoRegistrados();
    }

    @Get('dashboard-stats')
    getDashboardStats() {
        return this.pacientesService.getDashboardStats();
    }

    @Get('statistics')
    getStatistics(@Query('year') year: string) {
        return this.pacientesService.getStatistics(year ? +year : new Date().getFullYear());
    }


    @Get()
    findAll(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('search') search: string = '',
    ) {
        return this.pacientesService.findAll(
            Number(page), 
            Number(limit), 
            search,
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pacientesService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePacienteDto: UpdatePacienteDto) {
        return this.pacientesService.update(+id, updatePacienteDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pacientesService.remove(+id);
    }
}