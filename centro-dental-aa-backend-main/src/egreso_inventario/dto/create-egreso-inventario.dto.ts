import { IsNotEmpty, IsNumber, IsString, IsOptional, Allow } from 'class-validator';

export class CreateEgresoInventarioDto {
    @IsNotEmpty()
    @IsNumber()
    inventarioId: number;

    @IsNotEmpty()
    @IsString()
    fecha: string;

    @IsNotEmpty()
    @IsNumber()
    cantidad: number;

    @IsOptional()
    @Allow()
    fecha_vencimiento?: string | null;

    
}
