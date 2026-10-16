import { IsString, IsEmail, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateUserDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsOptional()
    password: string;

    @IsString()
    estado: string;

    @IsString()
    @IsOptional()
    foto?: string;

    @IsNumber()
    @IsOptional()
    codigo_proforma?: number;

    @IsArray()
    @IsOptional()
    permisos?: string[];
}

