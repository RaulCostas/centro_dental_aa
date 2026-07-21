import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PagoTablet } from './entities/pago_tablet.entity';
import { CreatePagoTabletDto } from './dto/create-pago-tablet.dto';
import { Pago } from '../pagos/entities/pago.entity';

@Injectable()
export class PagosTabletService {
  constructor(
    @InjectRepository(PagoTablet)
    private repoTablet: Repository<PagoTablet>,
    @InjectRepository(Pago)
    private repoPagos: Repository<Pago>,
  ) {}

  async create(createDto: any): Promise<PagoTablet> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const localTodayStr = `${year}-${month}-${day}`;

    const nuevo = this.repoTablet.create({
        nombre_paciente: createDto.nombre_paciente,
        monto: createDto.monto,
        formaPago: { id: createDto.formaPagoId },
        fecha: localTodayStr,
        observaciones: createDto.observaciones
    });
    return await this.repoTablet.save(nuevo);
  }


}
