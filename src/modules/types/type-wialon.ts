export interface WialonResponse<T> {
  items?: T[];
  searchSpec?: any;
  dataFlags?: number;
  totalItemsCount?: number;
  indexFrom?: number;
  indexTo?: number;
}

export interface WialonRetranslator {
  id: number;
  nm: string;
  cls: number;
  mu: number;
  uacl: number;
  rtru?: any;
  [key: string]: any;
}

export interface WialonRetranslatorUnit {
  i: number;
  f: number;
  unitInfo?: WialonUnitInfo | null;
}

export interface WialonUnit {
  id: number;
  nm: string;
  cls: number;
  mu: number;
  uacl: number;
  netconn: number;
  uid?: string;
  uid2?: string;
  ph?: string;
  cmds?: WialonAvailableCommand[];
  cml?: Record<string, WialonCommand>;
  cml_max?: number;
  pos?: WialonPosition;
  lmsg?: WialonLastMessage;
  [key: string]: any;
}

export interface WialonAvailableCommand {
  n?: string;
  a?: number;
  t?: string;
  c?: string;
}

export interface WialonCommand {
  id?: number;
  n?: string;
  c?: string;
  a?: number;
  f?: number;
  p?: string;
  l?: string | number;
}

export interface WialonCommandResponse {
  status?: string;
  commandSent?: boolean;
  [key: string]: any;
}

export interface WialonUnitInfo {
  nm: string;
  cls: number;
  id: number;
  mu: number;
  netconn: number;
  uacl: number;
}

export interface WialonPosition {
  x: number;
  y: number;
  z: number;
  s: number;
  c: number;
  t: number;
  sc: number;
}

export interface WialonLastMessage {
  t: number;
  f: number;
  tp: string;
  pos?: WialonPosition;
  i?: number;
  p?: Record<string, any>;
}

export interface WialonMessagesResponse {
  messages?: WialonLastMessage[];
  count?: number;
}

export interface WialonError {
  error: number;
  reason?: string;
}
