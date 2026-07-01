import { formatInput } from "../../shared/format";

export interface ControlElements {
  readonly length: HTMLInputElement;
  readonly slenderness: HTMLInputElement;
  readonly diameter: HTMLInputElement;
  readonly cylindricalInsertLength: HTMLInputElement;
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