import {Timeframe} from '@matco/basic-tools/timeframe.js';

interface String {
	interpolate(object: {[key: string]: string}): string;
}

export declare class Timeline {
	constructor(container: Element, config: any, language?: string);
	getSectionsTimeframe(): Timeframe;
	getVisibleTimeframe(): Timeframe;
	getSection(section_id: string): any;
	draw(): void;
	setPeriod(period: Timeframe): void;
	drawGraphs(): void;
	getString(string: string): string;
}
