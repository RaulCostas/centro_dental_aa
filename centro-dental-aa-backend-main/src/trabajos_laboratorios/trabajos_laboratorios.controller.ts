import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { TrabajosLaboratoriosService } from './trabajos_laboratorios.service';
import { TrabajosLaboratoriosPdfService } from './trabajos_laboratorios-pdf.service';
import { ChatbotService } from '../chatbot/chatbot.service';

@Controller('trabajos-laboratorios')
export class TrabajosLaboratoriosController {
    constructor(
        private readonly trabajosService: TrabajosLaboratoriosService,
        private readonly pdfService: TrabajosLaboratoriosPdfService,
        private readonly chatbotService: ChatbotService,
    ) { }

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

    @Post(':id/send-whatsapp')
    @UseInterceptors(FileInterceptor('file'))
    async sendWhatsApp(@Param('id') id: string, @UploadedFile() file?: any) {
        try {
            const trabajo = await this.trabajosService.findOne(+id);

            if (!trabajo) {
                throw new HttpException('Trabajo de laboratorio no encontrado', HttpStatus.NOT_FOUND);
            }

            if (!trabajo.laboratorio) {
                throw new HttpException('El trabajo no tiene un laboratorio asignado.', HttpStatus.BAD_REQUEST);
            }

            if (!trabajo.laboratorio.celular) {
                return { message: 'El laboratorio no tiene un número de celular registrado.' };
            }

            const chatbotStatus = this.chatbotService.getStatus();
            if (chatbotStatus.status !== 'connected') {
                throw new HttpException('El chatbot no está conectado. Por favor, conecte el chatbot primero.', HttpStatus.SERVICE_UNAVAILABLE);
            }

            let phone = trabajo.laboratorio.celular.replace(/\D/g, '');
            if (phone.length === 8) {
                phone = '591' + phone;
            }
            const jid = phone + '@s.whatsapp.net';

            let pdfBuffer: Buffer;
            if (file && file.buffer) {
                pdfBuffer = file.buffer;
            } else {
                pdfBuffer = await this.pdfService.generateTrabajoLaboratorioPdf(trabajo);
            }

            const pacienteNombre = [trabajo.paciente?.paterno, trabajo.paciente?.materno, trabajo.paciente?.nombre].filter(Boolean).join(' ') || 'Paciente';
            const ordenNo = `A&A-${String(trabajo.id).padStart(7, '0')}`;
            const message = `Hola *${trabajo.laboratorio.laboratorio}*, le enviamos la Orden de Trabajo Dental N° *${ordenNo}* correspondiente al paciente *${pacienteNombre}*.`;

            await this.chatbotService.sendMessage(jid, {
                document: pdfBuffer,
                mimetype: 'application/pdf',
                fileName: `Orden_Trabajo_Dental_${ordenNo}.pdf`,
                caption: message
            });

            return {
                success: true,
                message: 'Orden de trabajo enviada por WhatsApp al laboratorio exitosamente'
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            console.error('Error sending WhatsApp to lab:', error);
            throw new HttpException('Error al enviar la orden por WhatsApp', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
