import { Injectable, NotFoundException } from '@nestjs/common';
import { WialonApiService } from 'src/modules/wialon-auth/application/services/wialon.service';
import { WialonUnit } from 'src/modules/types/type-wialon';

@Injectable()
export class GpsUnitResolverService {
  private readonly resolverSearchFlags = 2097153;

  constructor(private readonly wialonApiService: WialonApiService) {}

  async findBySerialNumber(
    sid: string,
    serialNumber: string,
  ): Promise<WialonUnit> {
    const candidates: WialonUnit[] = [];
    const uniqueIdResponse = await this.wialonApiService.searchUnitsByProperty(
      sid,
      'sys_unique_id',
      serialNumber,
      this.resolverSearchFlags,
    );
    candidates.push(...(uniqueIdResponse.items || []));

    const byNameResponse = await this.wialonApiService.searchUnitsByProperty(
      sid,
      'sys_name',
      `*${serialNumber}*`,
      this.resolverSearchFlags,
    );
    candidates.push(...(byNameResponse.items || []));

    const unit = await this.resolveMatchedUnit(
      sid,
      this.findBestSerialMatch(candidates, serialNumber),
    );

    if (!unit) {
      throw new NotFoundException({
        success: false,
        error: 'UNIT_NOT_FOUND',
        message: `No se encontro ninguna unidad con el numero de serie ${serialNumber} en la plataforma.`,
      });
    }

    return unit;
  }

  async findByVim(sid: string, vim: string): Promise<WialonUnit> {
    const byName = await this.wialonApiService.searchUnitsByProperty(
      sid,
      'sys_name',
      `*${vim}*`,
      16777215,
    );

    const namedUnit = byName.items?.find((unit) =>
      this.unitContains(unit, vim),
    );
    if (namedUnit) {
      return namedUnit;
    }

    const allUnits = await this.wialonApiService.searchUnits(
      sid,
      '*',
      16777215,
      0,
      0,
    );
    const unit = allUnits.items?.find((item) => this.unitContains(item, vim));

    if (!unit) {
      throw new NotFoundException({
        success: false,
        error: 'VEHICLE_NOT_FOUND',
        message: `No se encontro ningun vehiculo con el VIM ${vim} en la plataforma.`,
      });
    }

    return unit;
  }

  getSerialNumber(unit: WialonUnit): string | null {
    return (
      unit.uid ||
      unit.uid2 ||
      unit.ph ||
      this.findCustomValue(unit, 'imei') ||
      unit.nm ||
      null
    );
  }

  private unitContains(unit: WialonUnit, needle: string): boolean {
    const normalizedNeedle = needle.toLowerCase();
    return [
      unit.nm,
      unit.uid,
      unit.uid2,
      unit.ph,
      this.findCustomValue(unit, 'vim'),
      this.findCustomValue(unit, 'vin'),
    ].some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(normalizedNeedle),
    );
  }

  private findBestSerialMatch(
    units: WialonUnit[],
    serialNumber: string,
  ): WialonUnit | undefined {
    const normalizedSerial = this.normalizeValue(serialNumber);
    const dedupedUnits = Array.from(
      new Map(
        units.map((unit, index) => [this.getUnitDedupKey(unit, index), unit]),
      ).values(),
    );

    const exactMatch = dedupedUnits.find((unit) =>
      this.getUnitSerialCandidates(unit).some(
        (candidate) => this.normalizeValue(candidate) === normalizedSerial,
      ),
    );
    if (exactMatch) {
      return exactMatch;
    }

    return dedupedUnits.find((unit) =>
      this.getUnitSerialCandidates(unit).some((candidate) =>
        this.normalizeValue(candidate).includes(normalizedSerial),
      ),
    );
  }

  private getUnitSerialCandidates(unit: WialonUnit): string[] {
    return [
      unit.nm,
      unit.uid,
      unit.uid2,
      unit.ph,
      this.findCustomValue(unit, 'imei'),
      this.findCustomValue(unit, 'serial'),
    ].filter((value): value is string => Boolean(value));
  }

  private async resolveMatchedUnit(
    sid: string,
    unit: WialonUnit | undefined,
  ): Promise<WialonUnit | undefined> {
    if (!unit) {
      return undefined;
    }

    const resolvedUnitId = this.getResolvedUnitId(unit);
    if (resolvedUnitId !== null) {
      return {
        ...unit,
        id: resolvedUnitId,
      };
    }

    if (!unit.nm) {
      return unit;
    }

    const byNameResponse = await this.wialonApiService.searchUnitsByProperty(
      sid,
      'sys_name',
      unit.nm,
      this.resolverSearchFlags,
    );
    const matchedByName = (byNameResponse.items || []).find(
      (candidate) => this.getResolvedUnitId(candidate) !== null,
    );

    if (!matchedByName) {
      return unit;
    }

    return {
      ...matchedByName,
      id: this.getResolvedUnitId(matchedByName) as number,
    };
  }

  private getResolvedUnitId(unit: WialonUnit): number | null {
    const parsed = Number.parseInt(String(unit.id), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  private getUnitDedupKey(unit: WialonUnit, index: number): string {
    const resolvedUnitId = this.getResolvedUnitId(unit);
    if (resolvedUnitId !== null) {
      return `id:${resolvedUnitId}`;
    }

    if (unit.nm) {
      return `nm:${this.normalizeValue(unit.nm)}`;
    }

    return `idx:${index}`;
  }

  private normalizeValue(value: string): string {
    return value.trim().toLowerCase();
  }

  private findCustomValue(unit: WialonUnit, key: string): string | null {
    const fields = unit.flds as unknown;
    if (!fields || typeof fields !== 'object') {
      return null;
    }

    for (const field of Object.values(
      fields as Record<string, Record<string, unknown>>,
    )) {
      const name = this.toPrimitiveString(field.n).toLowerCase();
      if (name.includes(key)) {
        return this.toPrimitiveString(field.v);
      }
    }

    return null;
  }

  private toPrimitiveString(value: unknown): string {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }

    return '';
  }
}
