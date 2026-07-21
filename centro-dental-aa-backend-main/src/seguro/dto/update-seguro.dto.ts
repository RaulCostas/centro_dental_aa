import { PartialType } from '@nestjs/mapped-types';
import { CreateSeguroDto } from './create-seguro.dto';

export class UpdateSeguroDto extends PartialType(CreateSeguroDto) {}
