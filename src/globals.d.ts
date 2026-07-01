import type {TimeUnitDefinition} from './time.js';

declare global {
	interface Date {
		getUnitValue(unit: TimeUnitDefinition): number;
		getUnitValueLabel(unit: TimeUnitDefinition, locale: string): string;
		getFullUnitValueLabel(unit: TimeUnitDefinition, locale: string): string;
		toUTCUnitDisplay(unit: TimeUnitDefinition): string;
		setUnitValue(unit: TimeUnitDefinition, value: number): number;
		addDuration(unit: TimeUnitDefinition, value: number): Date;
	}
}
