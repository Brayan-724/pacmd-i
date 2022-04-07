import { PropertyType } from "./PropertyType";

export class Property<T extends PropertyType = PropertyType> {
  static get none() {
    return new Property(PropertyType.None, "", false);
  }
  constructor(
    public readonly type: T,
    public readonly value: string,
    public readonly isActual: boolean
  ) {}
}
