import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Especialidad } from '../../especialidad/entities/especialidad.entity';
import { GrupoInventario } from '../../grupo_inventario/entities/grupo_inventario.entity';
import { EgresoInventario } from '../../egreso_inventario/entities/egreso_inventario.entity';
import { PedidosDetalle } from '../../pedidos/entities/pedidos-detalle.entity';


@Entity('inventario')
export class Inventario {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    descripcion: string;

    @Column('int')
    cantidad_existente: number;

    @Column('int')
    stock_minimo: number;

    @Column({ type: 'text',  default: 'Activo' })
    estado: string; // 'Activo' | 'Inactivo'

    @ManyToOne(() => Especialidad, (especialidad) => especialidad.inventarios)
    @JoinColumn({ name: 'idespecialidad' })
    especialidad: Especialidad;

    @Column({ type: 'int',  nullable: true })
    idespecialidad: number;

    @ManyToOne(() => GrupoInventario, (grupo) => grupo.inventarios)
    @JoinColumn({ name: 'idgrupo_inventario' })
    grupoInventario: GrupoInventario;

    @Column({ type: 'int',  nullable: true })
    idgrupo_inventario: number;

    @OneToMany(() => EgresoInventario, (egreso) => egreso.inventario)
    egresosInventario: EgresoInventario[];

    @OneToMany(() => PedidosDetalle, (detalle) => detalle.inventario)
    pedidosDetalle: PedidosDetalle[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    

    
}
