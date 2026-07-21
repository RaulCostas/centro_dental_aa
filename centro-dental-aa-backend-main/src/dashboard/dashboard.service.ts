import { Injectable } from '@nestjs/common';
import { PersonalService } from '../personal/personal.service';
import { PacientesService } from '../pacientes/pacientes.service';
import { AgendaService } from '../agenda/agenda.service';
import { GastosFijosService } from '../gastos_fijos/gastos_fijos.service';
import { TrabajosLaboratoriosService } from '../trabajos_laboratorios/trabajos_laboratorios.service';
import { InventarioService } from '../inventario/inventario.service';
import { RecordatorioService } from '../recordatorio/recordatorio.service';
import { RecordatorioTratamientoService } from '../recordatorio-tratamiento/recordatorio-tratamiento.service';
import { RecordatorioPlanService } from '../recordatorio_plan/recordatorio-plan.service';
import { ProformasService } from '../proformas/proformas.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly personalService: PersonalService,
    private readonly pacientesService: PacientesService,
    private readonly agendaService: AgendaService,
    private readonly gastosFijosService: GastosFijosService,
    private readonly trabajosLaboratoriosService: TrabajosLaboratoriosService,
    private readonly inventarioService: InventarioService,
    private readonly recordatorioService: RecordatorioService,
    private readonly recordatorioTratamientoService: RecordatorioTratamientoService,
    private readonly recordatorioPlanService: RecordatorioPlanService,
    private readonly proformasService: ProformasService,
  ) {}

  async getSummary(usuarioId?: number) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentDay = today.getDate();
    const currentMonth = today.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase();

    const [
      personalBirthdays,
      pacienteStats,
      agendaTodayRaw,
      gastosFijosRaw,
      labAlerts,
      lowStock,
      noRegistrados,
      reminders,
      pendingTreatments,
      pendingPlans,
      duePlanesPago,
    ] = await Promise.all([
      this.personalService.getBirthdays(),
      this.pacientesService.getDashboardStats(),
      this.agendaService.findAll(todayStr),
      this.gastosFijosService.findAll(),
      this.trabajosLaboratoriosService.findTerminadosSinCita(),
      this.inventarioService.findLowStock(),
      this.pacientesService.findNoRegistrados(),
      this.recordatorioService.findActivos(usuarioId),
      this.recordatorioTratamientoService.findPending(),
      this.recordatorioPlanService.findPending(),
      this.proformasService.findDuePlanesPago(),
    ]);

    // Filter today's appointments count
    const todayAppointmentsCount = agendaTodayRaw.filter((app: any) => 
      app.estado === 'agendado' || app.estado === 'confirmado'
    ).length;

    // Filter due expenses
    const dueGastos = gastosFijosRaw.filter(gasto => {
      if (gasto.dia !== currentDay) return false;
      if (gasto.anual) {
        return gasto.mes?.toLowerCase() === currentMonth;
      }
      return true;
    });

      return {
      personalBirthdays,
      pacienteStats,
      todayAppointmentsCount,
      dueGastos,
      labAlerts,
      lowStock,
      noRegistrados,
      reminders,
      pendingTreatments,
      pendingPlans,
      duePlanesPago,
    };
  }
}
