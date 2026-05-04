import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WialonCommandResponse,
  WialonError,
  WialonMessagesResponse,
  WialonResponse,
  WialonRetranslator,
  WialonUnit,
} from 'src/modules/types/type-wialon';

@Injectable()
export class WialonApiService {
  private readonly unitCommandsFlags = 524800;
  private readonly apiUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly commandQueueTimeoutSeconds: number;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WIALON_API_URL') || '';
    this.requestTimeoutMs = this.parsePositiveInteger(
      this.configService.get<string>('WIALON_REQUEST_TIMEOUT_MS'),
      30000,
    );
    this.commandQueueTimeoutSeconds = this.parsePositiveInteger(
      this.configService.get<string>('WIALON_COMMAND_TIMEOUT_SECONDS'),
      60,
    );
  }

  private async makeRequest<T extends object>(
    service: string,
    params: Record<string, any>,
    sid: string,
    method: 'GET' | 'POST' = 'POST',
  ): Promise<T> {
    const url = `${this.apiUrl}?svc=${service}&params=${JSON.stringify(params)}&sid=${sid}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
      });
      const data = (await response.json()) as T | WialonError;

      if ('error' in data && typeof data.error === 'number') {
        throw new HttpException(
          `Wialon API Error: ${data.reason || data.error}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          'Wialon API timeout',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      throw new HttpException(
        'Error al conectar con Wialon',
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async searchRetranslators(
    sid: string,
    searchMask: string = '*',
    flags: number = 257,
  ): Promise<WialonResponse<WialonRetranslator>> {
    return this.makeRequest<WialonResponse<WialonRetranslator>>(
      'core/search_items',
      {
        spec: {
          itemsType: 'avl_retranslator',
          propName: 'sys_name',
          propValueMask: searchMask,
          sortType: 'sys_name',
        },
        force: 1,
        flags,
        from: 0,
        to: 0,
      },
      sid,
    );
  }

  async searchUnits(
    sid: string,
    searchMask: string = '*',
    flags: number = 2097153,
    from: number = 0,
    to: number = 0,
  ): Promise<WialonResponse<WialonUnit>> {
    return this.makeRequest<WialonResponse<WialonUnit>>(
      'core/search_items',
      {
        spec: {
          itemsType: 'avl_unit',
          propName: 'sys_name',
          propValueMask: searchMask,
          sortType: 'sys_name',
        },
        force: 1,
        flags,
        from,
        to,
      },
      sid,
    );
  }

  async searchUnitsByIds(
    sid: string,
    unitIds: number[],
    flags: number = 2097153,
  ): Promise<WialonResponse<WialonUnit>> {
    return this.makeRequest<WialonResponse<WialonUnit>>(
      'core/search_items',
      {
        spec: {
          itemsType: 'avl_unit',
          propName: 'sys_id',
          propValueMask: unitIds.join(','),
          sortType: 'sys_name',
        },
        force: 1,
        flags,
        from: 0,
        to: 0,
      },
      sid,
    );
  }

  async getUnitById(
    sid: string,
    unitId: number,
    flags: number = this.unitCommandsFlags,
  ): Promise<WialonUnit | null> {
    const response = await this.searchUnitsByIds(sid, [unitId], flags);
    return response.items?.[0] || null;
  }

  async searchUnitsByProperty(
    sid: string,
    propName: string,
    propValueMask: string,
    flags: number = 16777215,
    from: number = 0,
    to: number = 0,
  ): Promise<WialonResponse<WialonUnit>> {
    return this.makeRequest<WialonResponse<WialonUnit>>(
      'core/search_items',
      {
        spec: {
          itemsType: 'avl_unit',
          propName,
          propValueMask,
          sortType: 'sys_name',
        },
        force: 1,
        flags,
        from,
        to,
      },
      sid,
    );
  }

  async executeUnitCommand(
    sid: string,
    unitId: number,
    commandName: string,
    params: string = '',
    linkType: string = '',
  ): Promise<WialonCommandResponse> {
    const normalizedUnitId = Number.parseInt(String(unitId), 10);
    const normalizedTimeout = Number.parseInt(
      String(this.commandQueueTimeoutSeconds),
      10,
    );

    return this.makeRequest<WialonCommandResponse>(
      'unit/exec_cmd',
      {
        itemId: normalizedUnitId,
        commandName,
        linkType,
        param: params,
        timeout: normalizedTimeout,
        flags: 0,
      },
      sid,
      'POST',
    );
  }

  getCommandQueueTimeoutSeconds(): number {
    return this.commandQueueTimeoutSeconds;
  }

  async loadUnitMessages(
    sid: string,
    unitId: number,
    timeFrom: number,
    timeTo: number,
    loadCount: number = 500,
  ): Promise<WialonMessagesResponse> {
    return this.makeRequest<WialonMessagesResponse>(
      'messages/load_interval',
      {
        itemId: unitId,
        timeFrom,
        timeTo,
        flags: 1,
        flagsMask: 65281,
        loadCount,
      },
      sid,
    );
  }

  private parsePositiveInteger(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number.parseInt(value || '', 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }
}
