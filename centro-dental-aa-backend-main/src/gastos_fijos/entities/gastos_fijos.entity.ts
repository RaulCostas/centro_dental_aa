import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';


@Entity('gastos_fijos')
export class GastosFijos {
    @PrimaryGeneratedColumn()
    id: number;



    @Column({ type: 'int' })
    dia: number;

    @Column({ type: 'boolean',  default: false })
    anual: boolean;

    @Column({ type: 'text',  nullable: true })
    mes: string;

    @Column({ type: 'text' })
    gasto_fijo: string;

    @Column('decimal', { precision: 10, scale: 2 })
    monto: number;

    @Column({ type: 'text' })
    moneda: string;

    @Column({ type: 'text',  default: 'activo' })
    estado: string;

    

    
}
