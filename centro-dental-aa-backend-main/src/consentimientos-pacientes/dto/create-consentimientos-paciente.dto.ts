import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateConsentimientosPacienteDto {
    @IsNumber()
    @IsNotEmpty()
    pacienteId: number;

    @IsString()
    @IsNotEmpty()
    titulo: string;

    @IsString()
    @IsNotEmpty()
    contenido_generado: string;
}
