import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TrabajosLaboratoriosService } from './trabajos_laboratorios.service';

@Controller('trabajos-laboratorios')
export class TrabajosLaboratoriosController {
    constructor(private readonly trabajosService: TrabajosLaboratoriosService) { }

    @Post()
    create(@Body() createTrabajoLaboratorioDto: any) {
        return this.trabajosService.create(createTrabajoLaboratorioDto);
    }

    @Get()
    async findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search: string = '',
        @Query('estado') estado: string = '',
    ) {
        const [data, total] = await this.trabajosService.findAll(+page, +limit, search, estado);
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    @Get('alertas/terminados-sin-cita')
    findTerminadosSinCita() {
        return this.trabajosService.findTerminadosSinCita();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.trabajosService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateTrabajoLaboratorioDto: any) {
        return this.trabajosService.update(+id, updateTrabajoLaboratorioDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.trabajosService.remove(+id);
    }

    @Post(':id/upload-referencia')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = extname(file.originalname);
                cb(null, `trabajo-ref-${uniqueSuffix}${ext}`);
            }
        }),
        fileFilter: (req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/)) {
                return cb(new BadRequestException('Solo se permiten archivos de imagen'), false);
            }
            cb(null, true);
        }
    }))
    async uploadReferencia(@Param('id') id: string, @UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('Archivo no proporcionado');
        }
        return this.trabajosService.addFotografiaReferencia(+id, file.filename);
    }
}
