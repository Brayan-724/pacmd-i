import { Property } from "./Property";
import { PropertyRegex } from "./PropertyRegex";
import { PropertyType } from "./PropertyType";

export class PropertiesRegex<A extends PropertyRegex[]> {
  constructor(private readonly array: A) {}

  append(...regexes: PropertyRegex[]) {
    this.array.push(...regexes);
  }

  test(line: string): boolean {
    return this.array.some((regex) => regex.test(line));
  }

  generate(line: string): Property<PropertyType> | null {
    for (const regex of this.array) {
      const v = regex.generate(line);
      if (v !== null) return v;
    }

    return null;
  }

  get list(): PropertyRegex[] {
    return this.array;
  }
}
