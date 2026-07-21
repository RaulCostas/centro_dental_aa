import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FirmaDigital } from './entities/firma-digital.entity';
import { CreateFirmaDto } from './dto/create-firma.dto';
import { VerifyFirmaDto } from './dto/verify-firma.dto';
import * as crypto from 'crypto';
import { SupabaseStorageService } from '../common/storage/supabase-storage.service';
import { Paciente } from '../pacientes/entities/paciente.entity';
import { Proforma } from '../proformas/entities/proforma.entity';
import { Receta } from '../receta/entities/receta.entity';
import { Informe } from '../informes/entities/informe.entity';

@Injectable()
export class FirmasService {
    constructor(
        @InjectRepository(FirmaDigital)
        private firmaRepository: Repository<FirmaDigital>,
        private readonly storageService: SupabaseStorageService,
        private dataSource: DataSource,
    ) { }

    /**
     * Generate SHA-256 hash from document data
     */
    generateDocumentHash(documentData: any): string {
        const dataString = JSON.stringify(documentData);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Create a new digital signature
     */
    async create(createFirmaDto: CreateFirmaDto, usuarioId: number): Promise<FirmaDigital> {
        if (createFirmaDto.firmaData && createFirmaDto.firmaData.startsWith('data:image')) {
            try {
                createFirmaDto.firmaData = await this.storageService.uploadBase64('clinica-media', `signature-digital-${usuarioId}-${Date.now()}`, createFirmaDto.firmaData);
            } catch (error) {
                console.warn('[FirmasService] Supabase upload failed or not configured, saving as Base64 in database:', error.message);
                // Si falla Supabase (por ejemplo, en local sin config), dejamos la data como Base64
            }
        }

        const firma = this.firmaRepository.create({
            ...createFirmaDto,
            usuarioId,
            timestamp: new Date(),
        });

        const savedFirma = await this.firmaRepository.save(firma);

        // Actualizar estado de firma en las entidades correspondientes
        try {
            if (createFirmaDto.tipoDocumento === 'historia_clinica' || createFirmaDto.tipoDocumento === 'paciente') {
                // Intentar actualizar en pacientes particulares
                await this.dataSource.createQueryBuilder()
                    .update(Paciente)
                    .set({ esta_firmado: true })
                    .where("id = :id", { id: createFirmaDto.documentoId })
                    .execute();


            } else if (createFirmaDto.tipoDocumento === 'presupuesto') {
                await this.dataSource.createQueryBuilder()
                    .update(Proforma)
                    .set({ esta_firmado: true })
                    .where("id = :id", { id: createFirmaDto.documentoId })
                    .execute();
            } else if (createFirmaDto.tipoDocumento === 'receta') {
                await this.dataSource.createQueryBuilder()
                    .update(Receta)
                    .set({ esta_firmado: true })
                    .where("id = :id", { id: createFirmaDto.documentoId })
                    .execute();
            } else if (createFirmaDto.tipoDocumento === 'informe_medico') {
                await this.dataSource.createQueryBuilder()
                    .update(Informe)
                    .set({ esta_firmado: true })
                    .where("id = :id", { id: createFirmaDto.documentoId })
                    .execute();
            }
        } catch (error) {
            console.error('[FirmasService] Error updating esta_firmado status:', error.message);
        }

        return savedFirma;
    }

    /**
     * Get all signatures for a specific document
     */
    async findByDocumento(tipoDocumento: string, documentoId: number): Promise<FirmaDigital[]> {
        // Soporte para sinónimos: 'historia_clinica' y 'paciente' son equivalentes para el registro del paciente
        const query = this.firmaRepository.createQueryBuilder('firma')
            .leftJoinAndSelect('firma.usuario', 'usuario')
            .where('firma.documentoId = :documentoId', { documentoId });

        if (tipoDocumento === 'historia_clinica' || tipoDocumento === 'paciente') {
            query.andWhere('firma.tipoDocumento IN (:...tipos)', { tipos: ['historia_clinica', 'paciente'] });
        } else {
            query.andWhere('firma.tipoDocumento = :tipoDocumento', { tipoDocumento });
        }

        return await query
            .orderBy('firma.timestamp', 'ASC')
            .getMany();
    }

    /**
     * Get a single signature by ID
     */
    async findOne(id: number): Promise<FirmaDigital> {
        const firma = await this.firmaRepository.findOne({
            where: { id },
            relations: ['usuario'],
        });

        if (!firma) {
            throw new NotFoundException(`Firma con ID ${id} no encontrada`);
        }

        return firma;
    }

    /**
     * Verify signature integrity
     */
    async verify(id: number, verifyFirmaDto: VerifyFirmaDto): Promise<{ valid: boolean; message: string }> {
        const firma = await this.findOne(id);

        if (firma.hashDocumento === verifyFirmaDto.hashDocumento) {
            // Update verification status
            firma.verificado = true;
            await this.firmaRepository.save(firma);

            return {
                valid: true,
                message: 'Firma verificada correctamente. El documento no ha sido modificado.',
            };
        } else {
            return {
                valid: false,
                message: 'ADVERTENCIA: El hash del documento no coincide. El documento puede haber sido modificado después de la firma.',
            };
        }
    }

    /**
     * Get all signatures by user
     */
    async findByUsuario(usuarioId: number): Promise<FirmaDigital[]> {
        return await this.firmaRepository.find({
            where: { usuarioId },
            relations: ['usuario'],
            order: {
                timestamp: 'DESC',
            },
        });
    }

    /**
     * Delete a signature (admin only)
     */
    async remove(id: number): Promise<void> {
        const firma = await this.findOne(id);
        await this.firmaRepository.remove(firma);
    }

    /**
     * Get signature statistics
     */
    async getStats(): Promise<any> {
        const total = await this.firmaRepository.count();
        const verificadas = await this.firmaRepository.count({ where: { verificado: true } });

        const porTipo = await this.firmaRepository
            .createQueryBuilder('firma')
            .select('firma.tipoDocumento', 'tipo')
            .addSelect('COUNT(*)', 'count')
            .groupBy('firma.tipoDocumento')
            .getRawMany();

        return {
            total,
            verificadas,
            noVerificadas: total - verificadas,
            porTipo,
        };
    }
}
