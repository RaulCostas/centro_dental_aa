import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EstudiosComplementariosService } from './estudios-complementarios.service';
import { CreateEstudioComplementarioDto } from './dto/create-estudio-complementario.dto';
import { UpdateEstudioComplementarioDto } from './dto/update-estudio-complementario.dto';

@Controller('estudios-complementarios')
export class EstudiosComplementariosController {
  constructor(private readonly service: EstudiosComplementariosService) {}

  @Post()
  create(@Body() createDto: CreateEstudioComplementarioDto) {
    return this.service.create(createDto);
  }

  @Get()
  findAll(
    @Query('pacienteId') pacienteId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.service.findAll(
      pacienteId ? +pacienteId : undefined,
      +page,
      +limit,
      search,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateEstudioComplementarioDto) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `estudio-${uniqueSuffix}${ext}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      // Allow only images and PDFs
      if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
        return cb(new BadRequestException('Solo se permiten archivos de imagen o PDF'), false);
      }
      cb(null, true);
    }
  }))
  uploadFile(@Param('id') id: string, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }
    return this.service.updateFileUrl(+id, file.filename);
  }
}
