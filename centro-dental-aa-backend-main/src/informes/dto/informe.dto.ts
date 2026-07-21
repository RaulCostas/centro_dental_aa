import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateInformeDto {
    @IsNotEmpty()
    @IsNumber()
    pacienteId: number;

    @IsOptional()
    @IsNumber()
    userId?: number;

    @IsNotEmpty()
    @IsDateString()
    fecha: string;

    @IsNotEmpty()
    @IsString()
    contenido: string;

    @IsOptional()
    @IsBoolean()
    esta_firmado?: boolean;
}

export class UpdateInformeDto {
    @IsOptional()
    @IsDateString()
    fecha?: string;

    @IsOptional()
    @IsString()
    contenido?: string;

    @IsOptional()
    @IsBoolean()
    esta_firmado?: boolean;
}
