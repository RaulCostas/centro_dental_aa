import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'varchar', unique: true })
    email: string;

    @Column({ type: 'varchar' })
    password: string;

    @Column({ type: 'varchar' })
    estado: string;

    @Column({ nullable: true, type: 'text' })
    foto: string;


    @OneToMany('Propuesta', (propuesta: any) => propuesta.usuario)
    propuestas: any[];

    @Column({ type: 'json' , nullable: true })
    permisos: string[];
}
