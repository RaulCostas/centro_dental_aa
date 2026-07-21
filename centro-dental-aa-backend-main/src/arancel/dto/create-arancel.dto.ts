import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateArancelDto {
    @IsString()
    detalle: string;

    @IsNumber()
    @Min(0)
    precio: number;

    @IsString()
    moneda: string;

    @IsString()
    @IsOptional()
    estado?: string;

    @IsNumber()
    @Min(1)
    idEspecialidad: number;

    @IsString()
    @IsOptional()
    odontogramaColor?: string;

    @IsString()
    @IsOptional()
    odontogramaFigura?: string;
}
