import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WialonAvailableCommand,
  WialonCommand,
  WialonUnit,
} from 'src/modules/types/type-wialon';
import { WialonApiService } from 'src/modules/wialon-auth/application/services/wialon.service';
import { GpsCommandAuditOrmEntity } from '../../infrastructure/entities/gps-command-audit.orm-entity';
import { GpsUnitResolverService } from './gps-unit-resolver.service';

const COMMAND_ALIASES: Record<string, string[]> = {
  query: ['Localizar'],
  block_engine: [
    'block_engine',
    'bloqueo de motor',
    'apagado de motor',
    'apagar motor',
  ],
  unblock_engine: ['Habilitado de motor'],
};

interface ResolvedCommand {
  commandDisplayName: string;
  params: string;
  linkType: string;
  sourceName: string;
}

interface CommandDebugRequest {
  sidPreview: string;
  unitId: number;
  commandName: string;
  linkType: string;
  param: string;
  timeout: number;
}

@Injectable()
export class GpsCommandService {
  constructor(
    private readonly wialonApiService: WialonApiService,
    private readonly unitResolver: GpsUnitResolverService,
    @InjectRepository(GpsCommandAuditOrmEntity)
    private readonly auditRepository: Repository<GpsCommandAuditOrmEntity>,
  ) {}

  async execute(input: {
    sid: string;
    cmd: string;
    serialNumber: string;
    userId: string;
  }) {
    const aliases = COMMAND_ALIASES[input.cmd];
    if (!aliases) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_COMMAND',
        message: 'Comando invalido. Use query, block_engine o unblock_engine.',
      });
    }

    const unit = await this.unitResolver.findBySerialNumber(
      input.sid,
      input.serialNumber,
    );
    const resolvedUnitId = Number.parseInt(String(unit.id), 10);
    if (!Number.isFinite(resolvedUnitId) || resolvedUnitId <= 0) {
      throw new BadGatewayException({
        success: false,
        error: 'UNIT_RESOLUTION_ERROR',
        message:
          'La unidad encontrada no tiene un id valido para ejecutar comandos en Wialon.',
        serialNumber: input.serialNumber,
        unitName: unit.nm || null,
      });
    }

    const commandUnit = await this.loadUnitWithCommands(input.sid, unit);
    const resolvedCommand = this.resolveCommand(
      commandUnit,
      input.cmd,
      aliases,
    );

    try {
      const wialonResponse = await this.wialonApiService.executeUnitCommand(
        input.sid,
        resolvedUnitId,
        resolvedCommand.commandDisplayName,
        resolvedCommand.params,
        resolvedCommand.linkType,
      );
      const executedAt = new Date();

      await this.auditRepository.save({
        command: input.cmd,
        serialNumber: input.serialNumber,
        executedBy: input.userId,
        wialonUnitId: resolvedUnitId,
        unitName: commandUnit.nm,
        success: true,
        wialonResponse: {
          ...wialonResponse,
          resolvedCommandName: resolvedCommand.commandDisplayName,
          resolvedFrom: resolvedCommand.sourceName,
          resolvedParams: resolvedCommand.params,
        },
      });

      return {
        success: true,
        cmd: input.cmd,
        serialNumber: input.serialNumber,
        wialonUnitId: resolvedUnitId,
        unitName: commandUnit.nm,
        executedAt: executedAt.toISOString(),
        executedBy: input.userId,
        wialonResponse: {
          status: wialonResponse.status || 'ok',
          commandSent: wialonResponse.commandSent ?? true,
          resolvedCommandName: resolvedCommand.commandDisplayName,
          resolvedFrom: resolvedCommand.sourceName,
          resolvedParams: resolvedCommand.params,
          ...wialonResponse,
        },
      };
    } catch (error) {
      const normalizedError = this.normalizeExecutionError(
        error,
        commandUnit,
        input.cmd,
        this.buildDebugRequest(
          input.sid,
          resolvedUnitId,
          resolvedCommand.commandDisplayName,
          resolvedCommand.linkType,
          resolvedCommand.params,
          this.wialonApiService.getCommandQueueTimeoutSeconds(),
        ),
      );
      await this.auditRepository.save({
        command: input.cmd,
        serialNumber: input.serialNumber,
        executedBy: input.userId,
        wialonUnitId: resolvedUnitId,
        unitName: commandUnit.nm,
        success: false,
        errorCode: normalizedError.errorCode,
        errorMessage: normalizedError.message,
        wialonResponse: {
          resolvedCommandName: resolvedCommand.commandDisplayName,
          resolvedFrom: resolvedCommand.sourceName,
          resolvedParams: resolvedCommand.params,
        },
      });

      throw normalizedError.exception;
    }
  }

  async listUnitCommands(sid: string, unitId: number) {
    const unit = await this.wialonApiService.getUnitById(sid, unitId);
    if (!unit) {
      throw new NotFoundException({
        success: false,
        error: 'UNIT_NOT_FOUND',
        message: `No se encontro ninguna unidad con id ${unitId} en la plataforma.`,
      });
    }

    return {
      unitId: unit.id,
      unitName: unit.nm,
      serialNumber: this.unitResolver.getSerialNumber(unit),
      configuredCommands: Object.values(unit.cml || {}).map((command) => ({
        id: command.id || null,
        name: command.n || null,
        type: command.c || null,
        linkType: this.normalizeLinkType(command.l),
        rawLinkType: this.toStringValue(command.l) || null,
        params: command.p || '',
        accessLevel: command.a ?? null,
        phoneFlags: command.f ?? null,
      })),
      availableNow: (unit.cmds || []).map((command) => ({
        name: command.n || null,
        type: command.c || null,
        linkType: this.normalizeLinkType(command.t),
        rawLinkType: command.t || null,
        accessLevel: command.a ?? null,
      })),
    };
  }

  async executeDirect(input: {
    sid: string;
    unitId: number;
    commandName: string;
    linkType: string;
    param: string;
    userId: string;
  }) {
    const unit = await this.wialonApiService.getUnitById(
      input.sid,
      input.unitId,
    );
    if (!unit) {
      throw new NotFoundException({
        success: false,
        error: 'UNIT_NOT_FOUND',
        message: `No se encontro ninguna unidad con id ${input.unitId} en la plataforma.`,
      });
    }

    const resolvedUnitId = Number.parseInt(String(unit.id ?? input.unitId), 10);

    try {
      const wialonResponse = await this.wialonApiService.executeUnitCommand(
        input.sid,
        resolvedUnitId,
        input.commandName,
        input.param,
        input.linkType,
      );
      const executedAt = new Date();

      await this.auditRepository.save({
        command: input.commandName,
        serialNumber:
          this.unitResolver.getSerialNumber(unit) || String(resolvedUnitId),
        executedBy: input.userId,
        wialonUnitId: resolvedUnitId,
        unitName: unit.nm,
        success: true,
        wialonResponse: {
          ...wialonResponse,
          directExecution: true,
          linkType: input.linkType,
          param: input.param,
        },
      });

      return {
        success: true,
        unitId: resolvedUnitId,
        unitName: unit.nm,
        commandName: input.commandName,
        linkType: input.linkType,
        param: input.param,
        executedAt: executedAt.toISOString(),
        executedBy: input.userId,
        wialonResponse: {
          status: wialonResponse.status || 'ok',
          commandSent: wialonResponse.commandSent ?? true,
          ...wialonResponse,
        },
      };
    } catch (error) {
      const normalizedError = this.normalizeExecutionError(
        error,
        unit,
        input.commandName,
        this.buildDebugRequest(
          input.sid,
          resolvedUnitId,
          input.commandName,
          input.linkType,
          input.param,
          this.wialonApiService.getCommandQueueTimeoutSeconds(),
        ),
      );
      await this.auditRepository.save({
        command: input.commandName,
        serialNumber:
          this.unitResolver.getSerialNumber(unit) || String(resolvedUnitId),
        executedBy: input.userId,
        wialonUnitId: resolvedUnitId,
        unitName: unit.nm,
        success: false,
        errorCode: normalizedError.errorCode,
        errorMessage: normalizedError.message,
        wialonResponse: {
          directExecution: true,
          linkType: input.linkType,
          param: input.param,
        },
      });

      throw normalizedError.exception;
    }
  }

  private async loadUnitWithCommands(
    sid: string,
    unit: WialonUnit,
  ): Promise<WialonUnit> {
    const refreshedUnit = await this.wialonApiService.getUnitById(sid, unit.id);
    return refreshedUnit || unit;
  }

  private resolveCommand(
    unit: WialonUnit,
    requestedCommand: string,
    aliases: string[],
  ): ResolvedCommand {
    const commands = Object.values(unit.cml || {});
    const availableNow = unit.cmds || [];
    const normalizedAliases = aliases.map((alias) => this.normalizeText(alias));

    for (const command of commands) {
      const candidates = [
        command.n,
        command.c,
        command.l ? `${command.c}:${command.l}` : null,
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => this.normalizeText(value));

      const matches = normalizedAliases.some((alias) =>
        candidates.includes(alias),
      );
      if (matches) {
        const availableCommand = availableNow.find((item) => {
          const availableCandidates = [item.n, item.c]
            .filter((value): value is string => Boolean(value))
            .map((value) => this.normalizeText(value));

          return candidates.some((candidate) =>
            availableCandidates.includes(candidate),
          );
        });

        return {
          commandDisplayName: command.n || requestedCommand,
          params: '',
          linkType: this.resolveExecLinkType(command, availableCommand),
          sourceName: command.n || command.c || requestedCommand,
        };
      }
    }

    const availableCommands = this.getAvailableCommands(unit);

    throw new NotFoundException({
      success: false,
      error: 'COMMAND_NOT_AVAILABLE',
      message: `La unidad no tiene configurado un comando compatible para ${requestedCommand}.`,
      availableCommands,
      unitId: unit.id,
      unitName: unit.nm,
    });
  }

  private normalizeExecutionError(
    error: unknown,
    unit: WialonUnit,
    requestedCommand: string,
    debugRequest: CommandDebugRequest,
  ): {
    errorCode: string;
    message: string;
    exception: HttpException;
  } {
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();
      const responseMessage =
        typeof response === 'object' && response && 'message' in response
          ? String(response.message)
          : error.message;

      if (status === 504) {
        return {
          errorCode: 'WIALON_TIMEOUT',
          message:
            'El dispositivo no respondio al comando dentro del tiempo de espera. Intente nuevamente.',
          exception: new GatewayTimeoutException({
            success: false,
            error: 'WIALON_TIMEOUT',
            message:
              'El dispositivo no respondio al comando dentro del tiempo de espera. Intente nuevamente.',
            debugRequest,
          }),
        };
      }

      return {
        errorCode: 'WIALON_COMMAND_ERROR',
        message: responseMessage,
        exception: new BadGatewayException({
          success: false,
          error: 'WIALON_COMMAND_ERROR',
          message: responseMessage,
          unitName: unit.nm,
          requestedCommand,
          debugRequest,
        }),
      };
    }

    return {
      errorCode: 'WIALON_COMMAND_ERROR',
      message: 'Error al ejecutar el comando en Wialon.',
      exception: new BadGatewayException({
        success: false,
        error: 'WIALON_COMMAND_ERROR',
        message: 'Error al ejecutar el comando en Wialon.',
        unitName: unit.nm,
        requestedCommand,
        debugRequest,
      }),
    };
  }

  private buildDebugRequest(
    sid: string,
    unitId: number,
    commandName: string,
    linkType: string,
    param: string,
    timeout: number,
  ): CommandDebugRequest {
    return {
      sidPreview: sid ? `${sid.substring(0, 10)}...` : '',
      unitId,
      commandName,
      linkType,
      param,
      timeout,
    };
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private toStringValue(value: string | number | undefined): string {
    if (value === undefined) {
      return '';
    }

    return String(value);
  }

  private normalizeLinkType(value: string | number | undefined): string {
    const normalized = this.toStringValue(value).trim().toLowerCase();
    if (!normalized || normalized === 'auto' || normalized === 'automatico') {
      return '';
    }

    if (['tcp', 'udp', 'vrt', 'gsm'].includes(normalized)) {
      return normalized;
    }

    return '';
  }

  private resolveExecLinkType(
    configuredCommand: WialonCommand,
    availableCommand?: WialonAvailableCommand,
  ): string {
    const configuredLinkType = this.normalizeLinkType(configuredCommand.l);
    if (configuredLinkType) {
      return configuredLinkType;
    }

    const rawAvailableLinkType = this.toStringValue(availableCommand?.t);
    const supportedLinkTypes = rawAvailableLinkType
      .split(',')
      .map((value) => this.normalizeLinkType(value))
      .filter((value): value is string => Boolean(value));

    const preferredOrder = ['tcp', 'vrt', 'gsm', 'udp'];
    for (const linkType of preferredOrder) {
      if (supportedLinkTypes.includes(linkType)) {
        return linkType;
      }
    }

    return '';
  }

  private getAvailableCommands(unit: WialonUnit): string[] {
    const configuredCommands = Object.values(unit.cml || {})
      .map((command) => this.formatConfiguredCommand(command))
      .filter((value): value is string => Boolean(value));

    if (configuredCommands.length > 0) {
      return configuredCommands;
    }

    return (unit.cmds || [])
      .map((command) => this.formatAvailableCommand(command))
      .filter((value): value is string => Boolean(value));
  }

  private formatConfiguredCommand(command: WialonCommand): string | null {
    const commandName = command.n?.trim();
    const commandType = command.c?.trim();

    if (commandName && commandType && commandName !== commandType) {
      return `${commandName} (${commandType})`;
    }

    return commandName || commandType || null;
  }

  private formatAvailableCommand(
    command: WialonAvailableCommand,
  ): string | null {
    const commandName = command.n?.trim();
    const commandType = command.c?.trim();

    if (commandName && commandType && commandName !== commandType) {
      return `${commandName} (${commandType})`;
    }

    return commandName || commandType || null;
  }
}
