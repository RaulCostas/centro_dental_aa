import { PartialType } from '@nestjs/mapped-types';
import { CreateConsentimientosPacienteDto } from './create-consentimientos-paciente.dto';

export class UpdateConsentimientosPacienteDto extends PartialType(CreateConsentimientosPacienteDto) {}
