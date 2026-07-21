import { Controller, Get, Post, Body, Put, Param, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DatosCentroDentalService } from './datos_centro_dental.service';
import { CreateDatosCentroDentalDto } from './dto/create-datos-centro-dental.dto';
import { UpdateDatosCentroDentalDto } from './dto/update-datos-centro-dental.dto';

@Controller('datos-centro-dental')
export class DatosCentroDentalController {
  constructor(private readonly service: DatosCentroDentalService) {}

  @Post()
  create(@Body() createDto: CreateDatosCentroDentalDto) {
    return this.service.create(createDto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateDatosCentroDentalDto) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @Post(':id/qr')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `qr-${uniqueSuffix}${ext}`);
      }
    })
  }))
  uploadQr(@Param('id') id: string, @UploadedFile() file: any) {
    return this.service.updateQr(+id, file.filename);
  }
}
