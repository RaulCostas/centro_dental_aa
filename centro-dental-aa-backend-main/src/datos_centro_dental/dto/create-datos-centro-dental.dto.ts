import { IsString, IsOptional } from 'class-validator';

export class CreateDatosCentroDentalDto {
  @IsString()
  nombre: string;

  @IsString()
  direccion: string;

  @IsString()
  @IsOptional()
  latitud?: string;

  @IsString()
  @IsOptional()
  longitud?: string;

  @IsString()
  telefono: string;

  @IsString()
  celular: string;

  @IsString()
  emergencias: string;

  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  qr?: string;

  @IsString()
  @IsOptional()
  estado?: string;

  @IsString()
  @IsOptional()
  horarios?: string;
}
