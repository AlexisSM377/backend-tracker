import { WialonPosition, WialonUnit } from 'src/modules/types/type-wialon';

export class UnitResponseDto {
  id: number;
  name: string;
  class: number;
  connected: boolean;
  lastPosition?: PositionDto;
  lastMessageTime?: Date;

  static fromWialon(unit: WialonUnit): UnitResponseDto {
    const dto = new UnitResponseDto();
    dto.id = unit.id;
    dto.name = unit.nm;
    dto.class = unit.cls;
    dto.connected = unit.netconn === 1;

    if (unit.pos) {
      dto.lastPosition = PositionDto.fromWialon(unit.pos);
    }

    if (unit.lmsg?.t) {
      dto.lastMessageTime = new Date(unit.lmsg.t * 1000);
    }

    return dto;
  }
}

export class PositionDto {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  timestamp: Date;

  static fromWialon(pos: WialonPosition): PositionDto {
    const dto = new PositionDto();
    dto.latitude = pos.y;
    dto.longitude = pos.x;
    dto.altitude = pos.z;
    dto.speed = pos.s;
    dto.course = pos.c;
    dto.timestamp = new Date(pos.t * 1000);
    return dto;
  }
}
