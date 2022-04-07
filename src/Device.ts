export interface DeviceOptions {
  index: number;
  name?: string;
  cardName?: string;
  flags?: string[];
  isActual?: boolean;
}

export class Device {
  index: number;
  name: string;
  cardName: string;
  flags: string[];
  isActual: boolean;

  constructor(options: DeviceOptions) {
    this.index = options.index;
    this.name = options.name ?? "";
    this.cardName = options.cardName ?? "";
    this.flags = options.flags ?? [];
    this.isActual = options.isActual ?? false;
  }
}
