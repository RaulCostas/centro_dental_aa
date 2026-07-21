import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SeguroService } from './seguro.service';
import { CreateSeguroDto } from './dto/create-seguro.dto';
import { UpdateSeguroDto } from './dto/update-seguro.dto';

@Controller('seguro')
export class SeguroController {
    constructor(private readonly seguroService: SeguroService) { }

    @Post()
    create(@Body() createSeguroDto: CreateSeguroDto) {
        return this.seguroService.create(createSeguroDto);
    }

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.seguroService.findAll(
            search,
            page ? +page : 1,
            limit ? +limit : 10,
        );
    }



    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.seguroService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateSeguroDto: UpdateSeguroDto) {
        return this.seguroService.update(+id, updateSeguroDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.seguroService.remove(+id);
    }
}
