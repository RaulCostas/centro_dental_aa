import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PersonalTipo } from '../../personal_tipo/entities/personal_tipo.entity';


@Entity('personal')
export class Personal {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    paterno: string;

    @Column({ type: 'text' })
    materno: string;

    @Column({ type: 'text' })
    nombre: string;

    @Column({ type: 'text' })
    ci: string;

    @Column({ type: 'text' })
    direccion: string;

    @Column({ type: 'text' })
    telefono: string;

    @Column({ type: 'text' })
    celular: string;

    @Column({ type: 'date' })
    fecha_nacimiento: Date;

    @Column({ type: 'date' })
    fecha_ingreso: Date;

    @Column({ type: 'int',  nullable: true })
    personal_tipo_id: number;

    @ManyToOne(() => PersonalTipo, { eager: true })
    @JoinColumn({ name: 'personal_tipo_id' })
    personalTipo: PersonalTipo;

    @Column({ type: 'text',  default: 'activo' })
    estado: string;

    @Column({ type: 'date', nullable: true })
    fecha_baja: Date;

    

    
}
