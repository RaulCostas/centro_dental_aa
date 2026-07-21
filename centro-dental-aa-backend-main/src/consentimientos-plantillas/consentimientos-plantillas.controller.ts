import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ConsentimientosPlantillasService } from './consentimientos-plantillas.service';
import { CreateConsentimientosPlantillaDto } from './dto/create-consentimientos-plantilla.dto';
import { UpdateConsentimientosPlantillaDto } from './dto/update-consentimientos-plantilla.dto';

@Controller('consentimientos-plantillas')
export class ConsentimientosPlantillasController {
  constructor(private readonly consentimientosPlantillasService: ConsentimientosPlantillasService) {}

  @Post()
  create(@Body() createDto: CreateConsentimientosPlantillaDto) {
    return this.consentimientosPlantillasService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.consentimientosPlantillasService.findAll(pageNum, limitNum, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consentimientosPlantillasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateConsentimientosPlantillaDto) {
    return this.consentimientosPlantillasService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.consentimientosPlantillasService.remove(+id);
  }
}
