import { Injectable } from '@nestjs/common';
import { WialonLastMessage } from 'src/modules/types/type-wialon';
import { WialonApiService } from 'src/modules/wialon-auth/application/services/wialon.service';
import { GpsUnitResolverService } from './gps-unit-resolver.service';

@Injectable()
export class RecoveryService {
  constructor(
    private readonly unitResolver: GpsUnitResolverService,
    private readonly wialonApiService: WialonApiService,
  ) {}

  async findByVim(sid: string, vim: string) {
    const unit = await this.unitResolver.findByVim(sid, vim);
    const lastReportAt = unit.lmsg?.t
      ? new Date(unit.lmsg.t * 1000)
      : unit.pos?.t
        ? new Date(unit.pos.t * 1000)
        : null;
    const minutesWithoutReport = lastReportAt
      ? Math.floor((Date.now() - lastReportAt.getTime()) / 60000)
      : Number.MAX_SAFE_INTEGER;
    const isOnline = unit.netconn === 1 && minutesWithoutReport <= 15;
    const position = unit.pos || unit.lmsg?.pos;

    if (isOnline && position) {
      return {
        vim,
        unitName: unit.nm,
        status: 'online',
        location: {
          lat: position.y,
          lon: position.x,
          speed: position.s,
          heading: position.c,
          reportedAt: new Date(position.t * 1000).toISOString(),
        },
      };
    }

    return {
      vim,
      unitName: unit.nm,
      status: 'offline',
      lastReportAt: lastReportAt?.toISOString() || null,
      minutesWithoutReport,
      frequentLocations: await this.buildFrequentLocations(sid, unit.id, [
        unit.lmsg,
      ]),
    };
  }

  private async buildFrequentLocations(
    sid: string,
    unitId: number,
    fallbackMessages: Array<WialonLastMessage | undefined>,
  ) {
    const timeTo = Math.floor(Date.now() / 1000);
    const timeFrom = timeTo - 30 * 24 * 60 * 60;
    const history = await this.loadHistory(sid, unitId, timeFrom, timeTo);
    const messages = [...history, ...fallbackMessages].filter(
      (message): message is WialonLastMessage => Boolean(message?.pos),
    );
    const grouped = new Map<
      string,
      { lat: number; lon: number; visitCount: number }
    >();

    for (const message of messages) {
      const lat = Number(message.pos?.y.toFixed(6));
      const lon = Number(message.pos?.x.toFixed(6));
      const key = `${lat},${lon}`;
      const current = grouped.get(key);
      grouped.set(key, {
        lat,
        lon,
        visitCount: (current?.visitCount || 0) + 1,
      });
    }

    return [...grouped.values()]
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 3)
      .map((location, index) => ({
        rank: index + 1,
        ...location,
        label: this.getFrequentLocationLabel(index),
      }));
  }

  private async loadHistory(
    sid: string,
    unitId: number,
    timeFrom: number,
    timeTo: number,
  ): Promise<WialonLastMessage[]> {
    try {
      const history = await this.wialonApiService.loadUnitMessages(
        sid,
        unitId,
        timeFrom,
        timeTo,
      );
      return history.messages || [];
    } catch {
      return [];
    }
  }

  private getFrequentLocationLabel(index: number): string {
    const labels = [
      'Ubicacion mas frecuente',
      'Segunda ubicacion mas frecuente',
      'Tercera ubicacion mas frecuente',
    ];

    return labels[index] || 'Ubicacion frecuente';
  }
}
