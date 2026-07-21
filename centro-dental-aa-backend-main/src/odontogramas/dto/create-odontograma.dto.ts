import { IsNumber, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateOdontogramaDto {
    @IsNumber()
    @IsOptional()
    pacienteId?: number;

    @IsString()
    @IsOptional()
    notas?: string;

    @IsObject()
    @IsOptional()
    mapa_dientes?: any;

    @IsNumber()
    @IsOptional()
    usuarioId?: number;
}
