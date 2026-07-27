import { formatInput } from "../../shared/format";

export interface ControlElements {
  readonly length: HTMLInputElement;
  readonly breadth: HTMLInputElement;
  readonly height: HTMLInputElement;
  readonly slenderness: HTMLInputElement;
  readonly cylindricalInsertLength: HTMLInputElement;
  readonly geometryMode: HTMLSelectElement;
  readonly stations: HTMLInputElement;
  readonly showGrid: HTMLInputElement;
  readonly showPoints: HTMLInputElement;
}

export function writeNumericInput(input: HTMLInputElement, value: number): void {
  input.value = formatInput(value);
}

export function writeIntegerInput(input: HTMLInputElement, value: number): void {
  input.value = String(value);
}
