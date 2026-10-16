import { Controller, Get, Post, Body, Param, Delete, Query, Patch } from '@nestjs/common';
import { ConsentimientosPacientesService } from './consentimientos-pacientes.service';
import { CreateConsentimientosPacienteDto } from './dto/create-consentimientos-paciente.dto';

@Controller('consentimientos-pacientes')
export class ConsentimientosPacientesController {
  constructor(private readonly consentimientosPacientesService: ConsentimientosPacientesService) {}

  @Post()
  create(@Body() createDto: CreateConsentimientosPacienteDto) {
    return this.consentimientosPacientesService.create(createDto);
  }

  @Get()
  findAll(@Query('pacienteId') pacienteId?: string) {
    if (pacienteId) {
      return this.consentimientosPacientesService.findAllByPaciente(+pacienteId);
    }
    return [];
  }

  @Get('paciente/:pacienteId')
  findAllByPaciente(@Param('pacienteId') pacienteId: string) {
    return this.consentimientosPacientesService.findAllByPaciente(+pacienteId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consentimientosPacientesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.consentimientosPacientesService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.consentimientosPacientesService.remove(+id);
  }
}
