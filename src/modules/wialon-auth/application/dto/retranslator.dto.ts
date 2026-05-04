import {
  WialonRetranslator,
  WialonUnitInfo,
} from 'src/modules/types/type-wialon';

export class RetranslatorResponseDto {
  id: number;
  name: string;
  class: number;
  units: UnitInRetranslatorDto[];

  static fromWialon(retranslator: WialonRetranslator): RetranslatorResponseDto {
    const dto = new RetranslatorResponseDto();
    dto.id = retranslator.id;
    dto.name = retranslator.nm;
    dto.class = retranslator.cls;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-member-access
    dto.units = (retranslator.rtru || []).map(UnitInRetranslatorDto.fromWialon);
    return dto;
  }
}

export class UnitInRetranslatorDto {
  unitId: number;
  flags: number;
  info?: WialonUnitInfo;

  static fromWialon(unit: any): UnitInRetranslatorDto {
    const dto = new UnitInRetranslatorDto();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    dto.unitId = unit.i;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    dto.flags = unit.f;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    dto.info = unit.unitInfo || null;
    return dto;
  }
}
