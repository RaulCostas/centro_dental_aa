import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateSeguimientoTrabajoDto {
    @IsString()
    @IsNotEmpty()
    envio_retorno: string;

    @IsString()
    @IsNotEmpty()
    fecha: string;

    @IsString()
    @IsOptional()
    observaciones: string;

    @IsNumber()
    @IsNotEmpty()
    trabajoLaboratorioId: number;
}
