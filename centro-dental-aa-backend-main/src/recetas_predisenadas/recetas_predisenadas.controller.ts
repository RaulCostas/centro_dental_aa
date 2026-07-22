import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RecetasPredisenadasService } from './recetas_predisenadas.service';

@Controller('recetas-predisenadas')
export class RecetasPredisenadasController {
    constructor(private readonly service: RecetasPredisenadasService) {}

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('especialidadId') especialidadId?: string,
        @Query('estado') estado?: string,
    ) {
        const specIdNum = especialidadId ? Number(especialidadId) : undefined;
        return this.service.findAll(search, specIdNum, estado);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(+id);
    }

    @Post()
    create(@Body() body: any) {
        return this.service.create(body);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.service.update(+id, body);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(+id);
    }
}
