import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateConsentimientosPlantillaDto {
    @IsString()
    @IsNotEmpty()
    titulo: string;

    @IsString()
    @IsNotEmpty()
    contenido: string;

    @IsNumber()
    @IsOptional()
    especialidadId?: number;
}
