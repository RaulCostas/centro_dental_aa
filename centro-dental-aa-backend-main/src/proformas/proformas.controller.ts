import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, Res, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProformasService } from './proformas.service';
import { CreateProformaDto } from './dto/create-proforma.dto';
import { UpdateProformaDto } from './dto/update-proforma.dto';

@Controller('proformas')
export class ProformasController {
  constructor(private readonly proformasService: ProformasService) { }

  @Post()
  create(@Body() createProformaDto: CreateProformaDto) {
    console.log('Creating proforma with payload:', JSON.stringify(createProformaDto, null, 2));
    return this.proformasService.create(createProformaDto);
  }

  @Get()
  findAll(@Query('limit') limit?: number, @Query('page') page?: number) {
    return this.proformasService.findAll(limit);
  }

  @Get('paciente/:id')
  findAllByPaciente(@Param('id') id: string) {
    return this.proformasService.findAllByPaciente(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proformasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProformaDto: UpdateProformaDto) {
    console.log(`Updating proforma #${id} with payload:`, JSON.stringify(updateProformaDto, null, 2));
    return this.proformasService.update(+id, updateProformaDto);
  }


  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.proformasService.remove(+id);
  }

  @Post(':id/send-whatsapp')
  @UseInterceptors(FileInterceptor('file'))
  async sendWhatsApp(@Param('id') id: string, @UploadedFile() file: any) {
    return this.proformasService.sendWhatsApp(+id, file.buffer);
  }

  @Post(':id/imagenes')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@Param('id') id: string, @UploadedFile() file: any, @Body('descripcion') descripcion?: string) {
    return this.proformasService.uploadImage(+id, file.originalname, file.buffer, file.mimetype, descripcion);
  }

  @Get(':id/imagenes')
  getImages(@Param('id') id: string) {
    return this.proformasService.getImages(+id);
  }

  @Delete('imagenes/:id')
  removeImage(@Param('id') id: string) {
    return this.proformasService.removeImage(+id);
  }

  @Post('paciente/:id/imagenes')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPacienteImage(
    @Param('id') id: string, 
    @UploadedFile() file: any, 
    @Query('tipo') tipo: 'particular' = 'particular',
    @Body('descripcion') descripcion?: string
  ) {
    return this.proformasService.uploadPacienteImage(+id, tipo, file.originalname, file.buffer, file.mimetype, descripcion);
  }

  @Get('paciente/:id/imagenes-generales')
  getPacienteImages(@Param('id') id: string, @Query('tipo') tipo: 'particular' = 'particular') {
    return this.proformasService.getPacienteImages(+id, tipo);
  }
}
