import { PartialType } from '@nestjs/mapped-types';
import { CreateConsentimientosPlantillaDto } from './create-consentimientos-plantilla.dto';

export class UpdateConsentimientosPlantillaDto extends PartialType(CreateConsentimientosPlantillaDto) {}
