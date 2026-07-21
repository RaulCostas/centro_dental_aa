import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ConsentimientosPacientesService } from './consentimientos-pacientes.service';
import { CreateConsentimientosPacienteDto } from './dto/create-consentimientos-paciente.dto';

@Controller('consentimientos-pacientes')
export class ConsentimientosPacientesController {
  constructor(private readonly consentimientosPacientesService: ConsentimientosPacientesService) {}

  @Post()
  create(@Body() createDto: CreateConsentimientosPacienteDto) {
    return this.consentimientosPacientesService.create(createDto);
  }

  @Get('paciente/:pacienteId')
  findAllByPaciente(@Param('pacienteId') pacienteId: string) {
    return this.consentimientosPacientesService.findAllByPaciente(+pacienteId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.consentimientosPacientesService.remove(+id);
  }
}
