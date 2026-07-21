import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateConsentimientosPacienteDto } from './dto/create-consentimientos-paciente.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ConsentimientoPaciente } from './entities/consentimientos-paciente.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ConsentimientosPacientesService {
  constructor(
    @InjectRepository(ConsentimientoPaciente)
    private readonly conPacRepository: Repository<ConsentimientoPaciente>,
  ) {}

  create(createDto: CreateConsentimientosPacienteDto) {
    const con = this.conPacRepository.create(createDto);
    return this.conPacRepository.save(con);
  }

  findAllByPaciente(pacienteId: number) {
    return this.conPacRepository.find({
      where: { pacienteId },
      order: { id: 'DESC' },
    });
  }

  async remove(id: number) {
    const con = await this.conPacRepository.findOneBy({ id });
    if (!con) {
      throw new NotFoundException(`Consentimiento #${id} no encontrado`);
    }
    return this.conPacRepository.remove(con);
  }
}
