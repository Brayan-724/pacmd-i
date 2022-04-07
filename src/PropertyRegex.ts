import { Property } from "./Property";
import { PropertyType } from "./PropertyType";

export class PropertyRegex<
  T extends PropertyType = PropertyType,
  R extends (string | undefined)[] = (string | undefined)[]
> {
  readonly type: T;
  readonly regex: RegExp;

  constructor(type: T, regex: RegExp) {
    this.type = type;
    this.regex = regex;
  }

  test(line: string): boolean {
    return this.regex.test(line);
  }

  match(line: string): R | [null] {
    return (line.match(this.regex) ?? [null]) as R | [null];
  }

  generate(line: string): Property<T> | null {
    if (this.type === PropertyType.Index) {
      const [indexOut, isActual, index] = this.match(line);
      if (indexOut !== null && index != null) {
        return new Property<T>(this.type, index, !!isActual);
      }
    } else {
      const [valueOut, value] = this.match(line);
      if (valueOut !== null && value) {
        return new Property<T>(this.type, value, false);
      }
    }

    return null;
  }
}
