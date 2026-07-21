import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    getAggregateVotesInPollMessage,
} from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PacientesService } from '../pacientes/pacientes.service';
import { DoctorsService } from '../doctors/doctors.service';
import { AgendaService } from '../agenda/agenda.service';
import { PagosService } from '../pagos/pagos.service';
import { ProformasService } from '../proformas/proformas.service';
import { HistoriaClinicaService } from '../historia_clinica/historia_clinica.service';
import { PersonalService } from '../personal/personal.service';
import { ChatbotIntentosService } from './chatbot-intentos.service';
import { ChatbotIntento } from './entities/chatbot-intento.entity';
import { WhatsappSession } from './entities/whatsapp-session.entity';
import { ChatbotPdfService } from './chatbot-pdf.service';
import { InventarioService } from '../inventario/inventario.service';
import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore
import { decryptPollVote } from '@whiskeysockets/baileys/lib/Utils/process-message.js';
// @ts-ignore
import { getKeyAuthor } from '@whiskeysockets/baileys/lib/Utils/generics.js';
import { jidNormalizedUser } from '@whiskeysockets/baileys';

interface SessionState {
    sock: any;
    qrCode: string | null;
    status: 'disconnected' | 'connecting' | 'connected' | 'qr';
    intentionalDisconnect: boolean;
    initializationStartTime: number | null;
    initializationTimeout: NodeJS.Timeout | null;
    userSessions: Map<string, { type: 'new' | 'registered' | 'waiting_cancellation_reason' | 'waiting_agenda_response', timestamp: number, citaId?: number }>;
    pollStore: Map<string, { message: any, citaId: number }>;
}

@Injectable()
export class ChatbotService implements OnModuleInit, OnModuleDestroy {
    private sessions = new Map<number, SessionState>();

    constructor(
        private readonly pacientesService: PacientesService,
        private readonly agendaService: AgendaService,
        private readonly pagosService: PagosService,
        @Inject(forwardRef(() => ProformasService))
        private readonly proformasService: ProformasService,
        private readonly historiaClinicaService: HistoriaClinicaService,
        private readonly intentosService: ChatbotIntentosService,
        private readonly pdfService: ChatbotPdfService,
        private readonly doctorsService: DoctorsService,
        private readonly inventarioService: InventarioService,
        private readonly personalService: PersonalService,
        @InjectRepository(WhatsappSession)
        private readonly whatsappSessionRepository: Repository<WhatsappSession>,
    ) { }

    private getSession(): SessionState {
        if (!this.sessions.has(1)) {
            this.sessions.set(1, {
                sock: null,
                qrCode: null,
                status: 'disconnected',
                intentionalDisconnect: false,
                initializationStartTime: null,
                initializationTimeout: null,
                userSessions: new Map(),
                pollStore: new Map(),
            });
        }
        return this.sessions.get(1)!;
    }

    async onModuleInit() {
        console.log('[Chatbot] Starting initialization...');
        this.initialize().catch(err => {
            console.error(`[Chatbot] Failed to initialize session:`, err);
        });
    }

    async onModuleDestroy() {
        for (const [clinicId, session] of this.sessions.entries()) {
            if (session.sock) {
                try {
                    session.sock.end(undefined);
                } catch (e) { }
            }
        }
    }

    async initialize() {
        const session = this.getSession();
        if (session.status === 'connected' || session.status === 'connecting') {
            console.log(`[Chatbot] [CENTRO DENTAL A&A] Already connected or connecting. Skipping initialization.`);
            return;
        }

        session.intentionalDisconnect = false; // Reset flag
        session.status = 'connecting';
        session.initializationStartTime = Date.now();

        // Clear any existing timeout
        if (session.initializationTimeout) {
            clearTimeout(session.initializationTimeout);
        }

        // Set timeout to reset status if initialization takes too long
        session.initializationTimeout = setTimeout(() => {
            if (session.status === 'connecting') {
                console.log(`[Chatbot] [CENTRO DENTAL A&A] Initialization timeout - resetting to disconnected`);
                session.status = 'disconnected';
                session.qrCode = null;
                session.initializationStartTime = null;
                if (session.sock) {
                    try {
                        session.sock.end(undefined);
                    } catch (error) {
                        console.error(`[Chatbot] [CENTRO DENTAL A&A] Error ending socket on timeout:`, error);
                    }
                }
            }
        }, 60000); // Increased timeout to 60s for loading buffers

        try {
            const { state, saveCreds } = await this.useDatabaseAuthState(1);

            const { version, isLatest } = await fetchLatestBaileysVersion();
            console.log(`[Chatbot] [CENTRO DENTAL A&A] Initializing (WA version: ${version.join('.')}, isLatest: ${isLatest})...`);

            session.sock = makeWASocket({
                version,
                logger: pino({ level: 'error' }) as any,
                auth: {
                    creds: state.creds,
                    keys: state.keys,
                },
                generateHighQualityLinkPreview: true,
                browser: ['CENTRO DENTAL A&A Chatbot', 'Chrome', '1.0.0'],
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 10000,
                emitOwnEvents: true,
                retryRequestDelayMs: 250,
                getMessage: async (key) => {
                    if (key.id && session.pollStore.has(key.id)) {
                        return session.pollStore.get(key.id)!.message;
                    }
                    return undefined;
                }
            });

            console.log(`[Chatbot] [CENTRO DENTAL A&A] Socket created. Setting up event listeners...`);

            session.sock.ev.on('connection.update', async (update: any) => {
                const { connection, lastDisconnect, qr } = update;
                const elapsed = session.initializationStartTime ? Date.now() - session.initializationStartTime : 0;
                console.log(`[Chatbot] [CENTRO DENTAL A&A] Connection Update:`, { connection, qr: qr ? 'QR RECEIVED' : 'NO QR', elapsed: `${elapsed}ms` });

                if (qr) {
                    session.status = 'qr';
                    session.qrCode = await QRCode.toDataURL(qr);
                    console.log(`[Chatbot] [CENTRO DENTAL A&A] QR Code generated`);

                    if (session.initializationTimeout) {
                        clearTimeout(session.initializationTimeout);
                        session.initializationTimeout = null;
                    }
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
                    const errorMsg = lastDisconnect?.error?.message || 'Unknown error';
                    console.log(`[Chatbot] [CENTRO DENTAL A&A] Connection closed. Reconnecting:`, shouldReconnect, 'Error:', errorMsg);
                    session.status = 'disconnected';
                    session.qrCode = null;
                    session.initializationStartTime = null;

                    if (session.initializationTimeout) {
                        clearTimeout(session.initializationTimeout);
                        session.initializationTimeout = null;
                    }

                    if (shouldReconnect && !session.intentionalDisconnect) {
                        this.initialize();
                    } else {
                        console.log(`[Chatbot] [CENTRO DENTAL A&A] Logged out or Intentional Disconnect.`);
                    }
                } else if (connection === 'open') {
                    console.log(`[Chatbot] [CENTRO DENTAL A&A] Connection opened successfully`);
                    session.status = 'connected';
                    session.qrCode = null;
                    session.initializationStartTime = null;

                    if (session.initializationTimeout) {
                        clearTimeout(session.initializationTimeout);
                        session.initializationTimeout = null;
                    }
                }
            });

            session.sock.ev.on('creds.update', saveCreds);

            session.sock.ev.on('messages.upsert', async (m: any) => {
                try {
                    fs.appendFileSync(`chatbot-poll-upsert-clinica-dental.log`, `\n[${new Date().toISOString()}] messages.upsert: ${JSON.stringify(m)}\n`);
                } catch (e) { }

                for (const msg of m.messages) {
                    const pollUpdateMessage = msg.message?.pollUpdateMessage || msg.message?.messageContextInfo?.message?.pollUpdateMessage;
                    if (pollUpdateMessage) {
                        try {
                            const creationMsgKey = pollUpdateMessage.pollCreationMessageKey;
                            if (session.pollStore.has(creationMsgKey.id)) {
                                const { message: pollMsg, citaId } = session.pollStore.get(creationMsgKey.id)!;

                                const meIdNormalised = jidNormalizedUser(session.sock?.user?.id || '');
                                const pollCreatorJid = getKeyAuthor(creationMsgKey, meIdNormalised);
                                const voterJid = getKeyAuthor(msg.key, meIdNormalised);
                                const pollEncKey = pollMsg.messageContextInfo?.messageSecret!;

                                const voteMsg = decryptPollVote(
                                    pollUpdateMessage.vote!,
                                    {
                                        pollEncKey,
                                        pollCreatorJid,
                                        pollMsgId: creationMsgKey.id!,
                                        voterJid,
                                    }
                                );

                                const pollUpdates = [
                                    {
                                        pollUpdateMessageKey: msg.key,
                                        vote: voteMsg,
                                        senderTimestampMs: pollUpdateMessage.senderTimestampMs
                                    }
                                ];

                                const aggregation = getAggregateVotesInPollMessage({
                                    message: pollMsg,
                                    pollUpdates: pollUpdates as any
                                }, meIdNormalised);

                                fs.appendFileSync(`chatbot-poll-clinica-dental.log`, `\n[${new Date().toISOString()}] Manual Poll aggregation: ${JSON.stringify(aggregation)}\n`);
                                console.log(`[Chatbot] [CENTRO DENTAL A&A] Manual Poll aggregation:`, aggregation);
                                for (const agg of aggregation) {
                                    if (agg.voters.length > 0) {
                                        const isLid = msg.key.remoteJid?.endsWith('@lid');
                                        const normalizedMsgJid = isLid ? (msg.key.remoteJidAlt || msg.key.remoteJid) : msg.key.remoteJid;
                                        await this.handleAgendaPollResponse(agg.name, citaId, normalizedMsgJid!);
                                        break;
                                    }
                                }
                            }
                        } catch (err: any) {
                            fs.appendFileSync(`chatbot-poll-clinica-dental.log`, `\n[${new Date().toISOString()}] Decrypt Error: ${err.message}\n`);
                        }
                        continue;
                    }

                    if (!msg.key.fromMe) {
                        console.log(`[Chatbot] [CENTRO DENTAL A&A] New message received:`, JSON.stringify(msg, null, 2));
                        await this.handleMessage(msg);
                    }
                }
            });

            session.sock.ev.on('messages.update', async (event: any) => {
                for (const { key, update } of event) {
                    if (update.pollUpdates && session.pollStore.has(key.id)) {
                        const { message, citaId } = session.pollStore.get(key.id)!;
                        const aggregation = getAggregateVotesInPollMessage({
                            message: message,
                            pollUpdates: update.pollUpdates,
                        });

                        for (const agg of aggregation) {
                            if (agg.voters.length > 0) {
                                const selectedOption = agg.name;
                                let resolvedJid = key.remoteJid!;
                                if (resolvedJid?.endsWith('@lid')) {
                                    const storedJid = message?.key?.remoteJid;
                                    if (storedJid && !storedJid.endsWith('@lid')) {
                                        resolvedJid = storedJid;
                                    }
                                }
                                await this.handleAgendaPollResponse(selectedOption, citaId, resolvedJid);
                                break;
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error(`[Chatbot] [CENTRO DENTAL A&A] Error during initialization:`, error);
            session.status = 'disconnected';
            session.qrCode = null;
            session.initializationStartTime = null;
            if (session.initializationTimeout) {
                clearTimeout(session.initializationTimeout);
                session.initializationTimeout = null;
            }
            throw error;
        }
    }

    private async useDatabaseAuthState(clinicId: number = 1) {
        const { BufferJSON, initAuthCreds } = await import('@whiskeysockets/baileys');
        let creds: any;

        const sessionCreds = await this.whatsappSessionRepository.findOne({
            where: { type: 'creds' }
        });

        if (sessionCreds) {
            creds = JSON.parse(JSON.stringify(sessionCreds.data), BufferJSON.reviver);
        } else {
            creds = initAuthCreds();
        }

        const saveCreds = async () => {
            const existing = await this.whatsappSessionRepository.findOne({
                where: { type: 'creds' }
            });
            const serializedCreds = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
            if (existing) {
                existing.data = serializedCreds;
                await this.whatsappSessionRepository.save(existing);
            } else {
                const newSession = this.whatsappSessionRepository.create({
                    type: 'creds',
                    data: serializedCreds
                });
                await this.whatsappSessionRepository.save(newSession);
            }
        };

        return {
            state: {
                creds,
                keys: {
                    get: async (type: string, ids: string[]) => {
                        const data: { [id: string]: any } = {};
                        await Promise.all(
                            ids.map(async (id) => {
                                const typeKey = `key-${type}`;
                                const key = await this.whatsappSessionRepository.findOne({
                                    where: { type: typeKey, keyId: id }
                                });
                                if (key) {
                                    let value = JSON.parse(JSON.stringify(key.data), BufferJSON.reviver);
                                    data[id] = value;
                                }
                            })
                        );
                        return data;
                    },
                    set: async (data: any) => {
                        for (const type in data) {
                            for (const id in data[type]) {
                                const value = data[type][id];
                                const typeKey = `key-${type}`;
                                const existing = await this.whatsappSessionRepository.findOne({
                                    where: { type: typeKey, keyId: id }
                                });

                                if (value) {
                                    const serialized = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
                                    if (existing) {
                                        existing.data = serialized;
                                        await this.whatsappSessionRepository.save(existing);
                                    } else {
                                        const newKey = this.whatsappSessionRepository.create({
                                            type: typeKey,
                                            keyId: id,
                                            data: serialized
                                        });
                                        await this.whatsappSessionRepository.save(newKey);
                                    }
                                } else {
                                    if (existing) {
                                        await this.whatsappSessionRepository.remove(existing);
                                    }
                                }
                            }
                        }
                    }
                }
            },
            saveCreds
        };
    }

    async handleMessage(msg: any) {
        const session = this.getSession();
        let remoteJid = msg.key?.remoteJid;

        // NEW: Normalize JID if the message comes from a Linked Device (@lid)
        if (remoteJid?.endsWith('@lid') && msg.key.remoteJidAlt && msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
            console.log(`[Chatbot] [CENTRO DENTAL A&A] Normalized @lid incoming message to: ${msg.key.remoteJidAlt}`);
            remoteJid = msg.key.remoteJidAlt;
        }

        if (!remoteJid) {
            console.log(`[Chatbot] [CENTRO DENTAL A&A] No remoteJid found, skipping.`);
            return;
        }

        let senderJid = msg.key.participant || remoteJid;

        if (senderJid.endsWith('@lid') && msg.key.remoteJidAlt && msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
            console.log(`[Chatbot] [CENTRO DENTAL A&A] Detected @lid JID (${senderJid}), falling back to remoteJidAlt: ${msg.key.remoteJidAlt}`);
            senderJid = msg.key.remoteJidAlt;
        }

        const phonePart = senderJid.split('@')[0];
        const phone = phonePart.split(':')[0];
        const isGroup = remoteJid.endsWith('@g.us');

        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const normalizedText = text.toLowerCase();

        console.log(`[Chatbot] [CENTRO DENTAL A&A] New message from ${senderJid} in ${remoteJid}: "${text}"`);

        // ─── PRIORIDAD 1: Sesiones de espera activas ─────
        const currentSession = session.userSessions.get(remoteJid);

        if (currentSession && currentSession.type === 'waiting_agenda_response' && currentSession.citaId) {
            const respuesta = normalizedText.trim();
            if (respuesta === 'a') {
                try {
                    await this.agendaService.update(currentSession.citaId, { estado: 'confirmado' } as any);
                    await this.sendMessage(remoteJid, '¡Gracias! Tu cita ha sido confirmada satisfactoriamente. ✅');
                } catch (err) {
                    await this.sendMessage(remoteJid, 'Ocurrió un error al confirmar tu cita. Por favor, contáctanos directamente.');
                }
                session.userSessions.delete(remoteJid);
                return;
            } else if (respuesta === 'b') {
                try {
                    await this.agendaService.update(currentSession.citaId, { estado: 'cancelado' } as any);
                    await this.sendMessage(remoteJid, 'Por favor, comuníquese con la Clínica para agendar su cita en otra fecha y horario');
                } catch (err) {}
                session.userSessions.delete(remoteJid);
                return;
            } else {
                await this.sendMessage(remoteJid, 'Por favor responde *A* para confirmar o *B* para cancelar tu cita.');
                return;
            }
        }



        // ─── PRIORIDAD 2: Detener si es un grupo ──────────────────────────────────
        if (isGroup) return;

        // ─── PRIORIDAD 3: Intents y lógica regular ────────────────────────────────
        const intents = await this.intentosService.findAllActive();
        let matchedIntent: ChatbotIntento | null = null;

        let bestMatchKeyword = '';

        for (const intent of intents) {
            const keywords = intent.keywords.toLowerCase().split(',').map(k => k.trim());
            const matchedKeyword = keywords.find(k => {
                const safeK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${safeK}\\b`, 'i');
                return regex.test(normalizedText);
            });

            if (matchedKeyword && matchedKeyword.length > bestMatchKeyword.length) {
                bestMatchKeyword = matchedKeyword;
                matchedIntent = intent;
            }
        }

        let actor: any = null;
        let isDoctor = false;

        const phoneVariations = [
            phone,
            phone.startsWith('591') ? phone.substring(3) : '591' + phone,
            '+' + phone,
            phone.startsWith('591') ? '+' + phone : '+591' + phone
        ];

        if (matchedIntent?.target === 'USUARIO') {
            for (const p of phoneVariations) {
                actor = await this.doctorsService.findByCelular(p);
                if (actor) { isDoctor = true; break; }
            }
            if (!actor) {
                for (const p of phoneVariations) {
                    actor = await this.personalService.findByCelular(p);
                    if (actor) break;
                }
            }
            if (!actor) {
                await this.sendMessage(remoteJid, 'Lo siento, esta función está reservada para el personal de la clínica.');
                return;
            }
        } else {
            for (const p of phoneVariations) {
                actor = await this.pacientesService.findByCelular(p);
                if (actor) break;
            }
        }

        const menuSession = session.userSessions.get(remoteJid);
        const options = ['a', 'b', '1', '2', '3'];
        const isOption = options.includes(normalizedText);

        if (isOption && menuSession && (menuSession.type === 'new' || menuSession.type === 'registered')) {
            if (Date.now() - menuSession.timestamp < 300000) {
                await this.handleMenuOption(remoteJid, normalizedText, actor, menuSession.type as 'new' | 'registered');
                return;
            } else {
                session.userSessions.delete(remoteJid);
            }
        }

        if (matchedIntent) {
            try {
                switch (matchedIntent.action) {
                    case 'MENU_PRINCIPAL' as any:
                        await this.sendMenu(remoteJid, actor);
                        break;
                    case 'CONSULTAR_SALDO':
                        if (!isDoctor) {
                            const detailedReport = await this.calculateDetailedSaldo(actor.id);
                            await this.sendMessage(remoteJid, `Hola ${actor.nombre}, aquí está su estado de cuenta:\n\n${detailedReport}`);
                        }
                        break;
                    case 'CONSULTAR_CITA':
                        if (isDoctor) {
                            await this.checkDoctorAppointments(actor, remoteJid);
                        } else {
                            await this.checkAppointments(actor, remoteJid);
                        }
                        break;
                    case 'CONSULTAR_CITA_HOY':
                        if (isDoctor) {
                            await this.checkDoctorAppointmentsToday(actor, remoteJid);
                        }
                        break;
                    case 'TEXTO_LIBRE':
                        if (matchedIntent.replyTemplate) {
                            await this.sendMessage(remoteJid, matchedIntent.replyTemplate);
                        }
                        break;
                    case 'CONSULTAR_PRESUPUESTO':
                        if (!isDoctor) {
                            await this.executeConsultarPresupuesto(actor, remoteJid);
                        }
                        break;
                    case 'CONSULTAR_DIRECCION':
                        await this.sendMessage(remoteJid, `Nos encontramos en: la Av. Principal #123`);
                        break;
                    case 'CONSULTAR_HORARIO':
                        await this.sendMessage(remoteJid, `Nuestro horario de atención es de Lunes a Viernes de 8:00 a 18:00.`);
                        break;
                    case 'CONSULTAR_INVENTARIO' as any:
                        await this.handleConsultarInventario(remoteJid, normalizedText);
                        break;
                }
            } catch (error) {
                await this.sendMessage(remoteJid, 'Lo siento, ocurrió un error al procesar tu solicitud.');
            }
        } else {
            if (actor && !isDoctor && (normalizedText.includes('cita') || normalizedText.includes('cuando') || normalizedText.includes('agend'))) {
                await this.checkAppointments(actor, remoteJid);
            }
        }
    }


    async sendMenu(remoteJid: string, actor: any) {
        const session = this.getSession();
        let menuType: 'new' | 'registered' = actor ? 'registered' : 'new';
        let message = '';

        const clinicaNombre = 'CENTRO DENTAL A&A';

        if (menuType === 'new') {
            message = `¡Hola! Bienvenido a nuestra Clínica ${clinicaNombre}. ¿En qué podemos ayudarte?\n\n` +
                `*Menu:*\n` +
                `*A* ¿Donde queda la Clínica?\n` +
                `*B* ¿Cual es el horario de atención?\n\n` +
                `Por favor, responde con la letra de la opción que desees.`;
        } else {
            message = `¡Hola ${actor.nombre}! Bienvenido de nuevo. ¿En qué podemos ayudarte hoy?\n\n` +
                `*Menu Principal:*\n` +
                `*1* Consultar Citas\n` +
                `*2* Consultar Planes de Tratamientos\n` +
                `*3* Consultar mi Saldo\n\n` +
                `Por favor, responde con el número de la opción que desees.`;
        }

        await this.sendMessage(remoteJid, message);
        session.userSessions.set(remoteJid, { type: menuType, timestamp: Date.now() });
    }

    async handleMenuOption(remoteJid: string, option: string, actor: any, type: 'new' | 'registered') {
        const session = this.getSession();
        const opt = option.toUpperCase();

        switch (opt) {
            case 'A':
                await this.sendMessage(remoteJid, `Nos encontramos en: la Av. Principal #123`);
                break;
            case 'B':
                await this.sendMessage(remoteJid, `Nuestro horario de atención es de Lunes a Viernes de 8:00 a 18:00.`);
                break;
            case '1':
                if (type === 'registered') {
                    await this.checkAppointments(actor, remoteJid);
                } else {
                    await this.sendMessage(remoteJid, "Esta opción es solo para pacientes registrados.");
                }
                break;
            case '2':
                if (type === 'registered') {
                    await this.executeConsultarPresupuesto(actor, remoteJid);
                } else {
                    await this.sendMessage(remoteJid, "Esta opción es solo para pacientes registrados.");
                }
                break;
            case '3':
                if (type === 'registered') {
                    const detailedReport = await this.calculateDetailedSaldo(actor.id);
                    await this.sendMessage(remoteJid, `Hola ${actor.nombre}, aquí está su estado de cuenta:\n\n${detailedReport}`);
                } else {
                    await this.sendMessage(remoteJid, "Esta opción es solo para pacientes registrados.");
                }
                break;
            default:
                await this.sendMessage(remoteJid, "Opción no válida. Por favor, selecciona una de las opciones del menú.");
                break;
        }

        session.userSessions.set(remoteJid, { type, timestamp: Date.now() });
    }

    async executeConsultarPresupuesto(actor: any, remoteJid: string) {
        const proformas = await this.proformasService.findAllByPaciente(actor.id);
        if (proformas.length > 0) {
            try {
                const pdfBuffer = await this.pdfService.generateProformasPdf(actor, proformas);
                await this.sendMessage(remoteJid, {
                    document: pdfBuffer,
                    mimetype: 'application/pdf',
                    fileName: `Plan_Tratamiento_${actor.nombre}_${Date.now()}.pdf`,
                    caption: `Hola ${actor.nombre}, aquí tiene sus Planes de Tratamiento en PDF.`
                });
            } catch (error) {
                await this.sendMessage(remoteJid, 'Hubo un error al generar su archivo de Plan de Tratamiento.');
            }
        } else {
            await this.sendMessage(remoteJid, `Hola ${actor.nombre}, no encontré Planes de Tratamiento registrados.`);
        }
    }

    async calculateDetailedSaldo(pacienteId: number): Promise<string> {
        const proformas = await this.proformasService.findAllByPaciente(pacienteId);
        const historia = await this.historiaClinicaService.findAllByPaciente(pacienteId);
        const pagos = await this.pagosService.findAllByPaciente(pacienteId);

        const report = new Map<number, { ejecutado: number, pagado: number, numero: number }>();

        proformas.forEach(p => {
            report.set(p.id, { ejecutado: 0, pagado: 0, numero: p.numero });
        });

        historia.forEach(h => {
            if (h.estadoTratamiento === 'terminado' && h.proformaId) {
                const current = report.get(h.proformaId);
                if (current) {
                    current.ejecutado += Number(h.precio);
                }
            }
        });

        pagos.forEach(p => {
            if (p.proformaId) {
                const current = report.get(p.proformaId);
                if (current) {
                    current.pagado += Number(p.monto);
                }
            }
        });

        let messageParts: string[] = [];

        report.forEach((data, proformaId) => {
            const saldo = data.ejecutado - data.pagado;
            const saldoFavor = saldo < 0 ? Math.abs(saldo) : 0;
            const saldoContra = saldo > 0 ? saldo : 0;

        messageParts.push(`Plan de Tratamiento #${data.numero}
- Total Plan: ${data.ejecutado}
- Total Pagado: ${data.pagado}
- Saldo a Favor: ${saldoFavor}
- Saldo en contra: ${saldoContra}`);
        });

        if (messageParts.length === 0) {
            return "No tiene presupuestos registrados en el sistema.";
        }

        return messageParts.join('\n\n');
    }

    async checkAppointments(paciente: any, remoteJid: string) {
        const appointments = await this.agendaService.findAllByPaciente(paciente.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureAppointments = appointments.filter(a => {
            const [year, month, day] = a.fecha.toString().split('-').map(Number);
            const appDateObj = new Date(year, month - 1, day);
            return appDateObj >= today;
        });

        if (futureAppointments.length > 0) {
            const replies = futureAppointments.map(app => {
                // Format time to HH:mm (remove seconds)
                const timeParts = app.hora.split(':');
                const timeFormatted = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : app.hora;
                return `- ${app.fecha} a las ${timeFormatted}`;
            });

            const reply = `Hola ${paciente.nombre}, tienes las siguientes citas programadas:\n${replies.join('\n')}`;
            await this.sendMessage(remoteJid, reply);
        } else {
            const reply = `Hola ${paciente.nombre}, no encontré citas futuras agendadas.`;
            await this.sendMessage(remoteJid, reply);
        }
    }

    async checkDoctorAppointments(doctor: any, remoteJid: string) {
        // We reuse agendaService but need a method for Doctor?
        // Actually agendaService usually finds by Patient. We probably need findAllByDoctor in AgendaService.
        // If it doesn't exist, we must add it. For now, assuming I might need to add it or do a raw query.
        // Checking AgendaService... I don't recall seeing findAllByDoctor.
        // Let's assume I need to fetch all and filter, or add the method.
        // Ideally, I should add findAllByDoctor to AgendaService.
        // BUT, to save time/risk, I can check if AgendaService has a generic find.
        // Let's pause and check AgendaService. If I implement it here blindly it might fail.
        // For this step I will implement specific logic if I can, or use a query builder here if possible (but service separation is better).
        // Let's try to trust AgendaService has something or I add it.
        // Re-reading task: "Fetch weekly appointments for that doctor".

        // Let's implement this method assuming I'll add `findAllByDoctor` to AgendaService in next step if generic one fails.
        // Actually, to make this robust, I'll modify AgendaService first to support `findAllByDoctor`.
        // So for now I will leave this placeholder or partial implementation.

        // Wait, I can inject the repository if I really want to bypass, but better practice is to use AgendaService.
        // I'll assume AgendaService needs `findAllByDoctor`.
        // Let's write the call here and then implement it in AgendaService.
        const appointments = await this.agendaService.findAllByDoctor(doctor.id);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const weeklyAppointments = appointments.filter(a => {
            const [year, month, day] = a.fecha.toString().split('-').map(Number);
            const appDateObj = new Date(year, month - 1, day);
            return appDateObj >= today && appDateObj <= nextWeek;
        });

        if (weeklyAppointments.length > 0) {
            const replies = weeklyAppointments.map(app => {
                const timeParts = app.hora.split(':');
                const timeFormatted = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : app.hora;
                const pacienteName = app.paciente ? `${app.paciente.nombre} ${app.paciente.paterno}` : 'Paciente sin nombre';
                return `📅 ${app.fecha} 🕒 ${timeFormatted}\n👤 ${pacienteName}\n🏥 ${'CENTRO DENTAL A&A'}\n📝 ${app.tratamiento || 'Consulta'}`;
            });
            const reply = `Dr. ${doctor.paterno}, sus citas para esta semana:\n\n${replies.join('\n\n')}`;
            await this.sendMessage(remoteJid, reply);
        } else {
            await this.sendMessage(remoteJid, `Dr. ${doctor.paterno}, no tiene citas programadas para esta semana.`);
        }
    }

    async checkDoctorAppointmentsToday(doctor: any, remoteJid: string) {
        const appointments = await this.agendaService.findAllByDoctor(doctor.id);

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const todayAppointments = appointments.filter(a => a.fecha === todayStr && a.estado === 'confirmado');

        if (todayAppointments.length > 0) {
            const replies = todayAppointments.map(app => {
                const timeParts = app.hora.split(':');
                const timeFormatted = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : app.hora;
                const pacienteName = app.paciente ? `${app.paciente.nombre} ${app.paciente.paterno}` : 'Paciente sin nombre';
                return `📅 ${app.fecha} 🕒 ${timeFormatted}\n👤 ${pacienteName}\n🏥 ${'CENTRO DENTAL A&A'}\n📝 ${app.tratamiento || 'Consulta'}`;
            });
            const reply = `Dr. ${doctor.paterno}, sus citas para HOY:\n\n${replies.join('\n\n')}`;
            await this.sendMessage(remoteJid, reply);
        }
    }

    async sendBirthdayGreeting(pacienteId: number) {
        const paciente = await this.pacientesService.findOne(pacienteId);
        if (!paciente) {
            throw new Error('Paciente no encontrado');
        }

        // const currentYear = new Date().getFullYear();
        // if (paciente.ultimo_cumpleanos_felicitado === currentYear) {
        //     throw new Error('Ya se envió una felicitación a este paciente este año');
        // }

        let celular = paciente.telefono_celular?.replace(/\D/g, '');
        if (!celular) {
            throw new Error('El paciente no tiene número de celular registrado');
        }

        if (!celular.startsWith('591') && celular.length === 8) {
            celular = `591${celular}`;
        }
        const jid = `${celular}@s.whatsapp.net`;
        
        const clinicaText = 'CENTRO DENTAL A&A';
        const text = `¡Hola ${paciente.nombre} ${paciente.paterno}! 🎉 En nombre de todo el equipo de ${clinicaText}, te deseamos un muy feliz cumpleaños. ¡Que tengas un excelente día! 🎂🎈\n\n📌 Hola, somos ${clinicaText}, por favor guarda nuestro número para recibir tus felicitaciones y recordatorios.`;

        await this.sendMessage(jid, text);

        // await this.pacientesService.update(pacienteId, { ultimo_cumpleanos_felicitado: currentYear } as any);
        return { success: true };
    }

    async sendMessage(jid: string, content: string | any) {

        const session = this.getSession();
        if (session.status !== 'connected' || !session.sock) {
            console.warn(`[Chatbot] [CENTRO DENTAL A&A] Cannot send message to ${jid}: Not connected (status: ${session.status})`);
            throw new Error('El chatbot no está conectado a WhatsApp');
        }

        try {
            await session.sock.sendPresenceUpdate('composing', jid);
            // Increased delay to 3-8 seconds for better anti-ban protection
            const delayMs = Math.floor(Math.random() * 5000) + 3000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            await session.sock.sendPresenceUpdate('paused', jid);

            if (typeof content === 'string') {
                await session.sock.sendMessage(jid, { text: content });
            } else {
                await session.sock.sendMessage(jid, content);
            }
        } catch (error) {
            console.error(`[Chatbot] [CENTRO DENTAL A&A] Error sending message:`, error);
            throw error;
        }
    }

    async sendPdf(jid: string, base64: string, fileName: string, caption?: string) {
        const buffer = Buffer.from(base64, 'base64');
        await this.sendMessage(jid, {
            document: buffer,
            mimetype: 'application/pdf',
            fileName: fileName,
            caption: caption || ''
        });
    }

    async sendAgendaPoll(jid: string, pollName: string, options: string[], citaId: number) {
        const session = this.getSession();
        if (session.status !== 'connected' || !session.sock) {
            console.warn(`[Chatbot] [CENTRO DENTAL A&A] Cannot send poll to ${jid}: Not connected`);
            throw new Error('El chatbot no está conectado a WhatsApp');
        }

        try {
            await session.sock.sendPresenceUpdate('composing', jid);
            // Increased delay to 3-8 seconds
            const delayMs = Math.floor(Math.random() * 5000) + 3000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            await session.sock.sendPresenceUpdate('paused', jid);

            const msg = await session.sock.sendMessage(jid, {
                poll: {
                    name: pollName,
                    values: options,
                    selectableCount: 1
                }
            });
            session.pollStore.set(msg?.key?.id, { message: msg.message, citaId });
            try {
                fs.appendFileSync(`chatbot-poll-clinica-dental.log`, `\n[${new Date().toISOString()}] Sent Poll for Cita ${citaId}. msg.key.id: ${msg?.key?.id}\n`);
            } catch (e) { }
            return msg;
        } catch (error) {
            console.error(`[Chatbot] [CENTRO DENTAL A&A] Error sending poll:`, error);
            throw error;
        }
    }

    /**
     * Envía un menú de texto A/B al paciente y registra sesión waiting_agenda_response.
     */
    async sendAgendaMenu(jid: string, mensajeIntro: string, citaId: number): Promise<void> {
        const session = this.getSession();
        const menuTexto = `${mensajeIntro}\n\nPor favor responde con:\n*A* ✅ Confirmar Cita\n*B* ❌ Cancelar Cita`;
        await this.sendMessage(jid, menuTexto);
        session.userSessions.set(jid, {
            type: 'waiting_agenda_response' as any,
            timestamp: Date.now(),
            citaId,
        });
    }

    async handleAgendaPollResponse(selectedOption: string, citaId: number, remoteJid: string) {
        const session = this.getSession();
        if (selectedOption.includes('Confirmar')) {
            await this.agendaService.update(citaId, { estado: 'confirmado' } as any);
            await this.sendMessage(remoteJid, "¡Gracias! Tu cita ha sido confirmada satisfactoriamente.");
        } else if (selectedOption.includes('Cancelar')) {
            try {
                await this.agendaService.update(citaId, { estado: 'cancelado' } as any);
                await this.sendMessage(remoteJid, 'Por favor, comuníquese con la Clínica para agendar su cita en otra fecha y horario');
            } catch (err) {}
        }
    }

    getStatus() {
        const session = this.getSession();
        return {
            status: session.status,
            qr: session.qrCode
        };
    }

    async disconnect() {
        const session = this.getSession();
        if (session.sock) {
            session.intentionalDisconnect = true;
            session.sock.end(undefined);
            session.status = 'disconnected';
            session.qrCode = null;
            session.initializationStartTime = null;

            if (session.initializationTimeout) {
                clearTimeout(session.initializationTimeout);
                session.initializationTimeout = null;
            }
        }
    }

    async resetSession() {
        await this.disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));

        const session = this.getSession();
        session.status = 'disconnected';
        session.qrCode = null;

        // Clear database sessions for this clinic
        await this.whatsappSessionRepository.clear();
        console.log(`[Chatbot] Deleted database sessions for CENTRO DENTAL A&A`);
    }

    private async handleConsultarInventario(remoteJid: string, text: string) {
        const keywords = ['cuanto', 'cuantos', 'hay', 'stock', 'existencia', 'inventario', 'de'];
        let itemName = text;

        keywords.forEach(k => {
            const regex = new RegExp(`\\b${k}\\b`, 'gi');
            itemName = itemName.replace(regex, '');
        });

        itemName = itemName.replace(/[?¿!]/g, '').trim();

        if (!itemName) {
            await this.sendMessage(remoteJid, 'Por favor, dime qué producto deseas consultar. Ejemplo: "¿Cuánto algodón hay?"');
            return;
        }

        const result = await this.inventarioService.findAll(itemName, 1, 5);

        if (result.data.length === 0) {
            await this.sendMessage(remoteJid, `Lo siento, no encontré productos que coincidan con "${itemName}" en el inventario.`);
        } else if (result.data.length === 1) {
            const item = result.data[0];
            await this.sendMessage(remoteJid, `*Inventario:* ${item.descripcion}\n` +
                `- Clínica: ${'CENTRO DENTAL A&A'}\n` +
                `- Cantidad existente: ${item.cantidad_existente}\n` +
                `- Stock mínimo: ${item.stock_minimo}`);
        } else {
            let reply = `Encontré varios resultados para "${itemName}":\n\n`;
            result.data.forEach(item => {
                reply += `*${item.descripcion}*\n- Clínica: ${'CENTRO DENTAL A&A'}\n- Existencia: ${item.cantidad_existente} | Mínimo: ${item.stock_minimo}\n\n`;
            });
            reply += `Por favor, intenta ser más específico si no ves el producto que buscas.`;
            await this.sendMessage(remoteJid, reply);
        }
    }
}
