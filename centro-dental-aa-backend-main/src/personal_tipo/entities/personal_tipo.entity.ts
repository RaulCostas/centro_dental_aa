import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('personal_tipo')
export class PersonalTipo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar',  length: 255, unique: true })
    area: string;

    @Column({ type: 'varchar',  length: 20, default: 'activo' })
    estado: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at: Date;
}
