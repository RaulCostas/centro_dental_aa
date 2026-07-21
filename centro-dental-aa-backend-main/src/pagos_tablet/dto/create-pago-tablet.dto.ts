import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class CreatePagoTabletDto {
    @IsString()
    @IsNotEmpty()
    nombre_paciente: string;

    @IsNumber()
    @Min(0.01)
    monto: number;

    @IsNumber()
    @IsNotEmpty()
    formaPagoId: number;

    
}
