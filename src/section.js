import {Timeframe} from '@matco/basic-tools';
import {Reference} from './reference.js';
import {GraphType} from './graph_type.js';
import {ValueSymbol} from './value_symbol.js';

function value_comparator(value_1, value_2) {
	return value_2.date.compareTo(value_1.date);
}

export class Section {
	timeline;
	values = [];
	references = [];

	constructor(timeline, config) {
		this.timeline = timeline;

		//copy properties
		this.id = config.id;
		this.type = config.type;
		this.label = config.label;
		this.scale = config.scale;
		this.position = config.position;
		this.hiddenLegend = config.hiddenLegend;
		this.tooltip = config.tooltip;

		//style
		this.color = config.color;
		this.strokeColor = config.strokeColor;
		this.opacity = config.opacity;
		this.dashed = config.dashed;

		if(this.scale) {
			//check configuration of scales
			if(!this.scale.markInterval || !this.scale.labelInterval || !this.scale.position) {
				throw new Error(`Section [${this.id}] have an invalid scale (missing mark interval, label interval or position)`);
			}
			//check that mark interval is a multiple of label interval
			const factor = this.scale.labelInterval / this.scale.markInterval;
			const rounded_factor = Math.round(factor);
			if(Math.abs(rounded_factor - factor) > Number.EPSILON) {
				throw new Error(`Section [${this.id}] has an invalid scale (its mark interval is not a multiple of its label interval)`);
			}
		}

		//transform mark from string to symbol
		if(config.mark) {
			this.symbol = Object.values(ValueSymbol).find(s => s.id === config.mark) || ValueSymbol.SQUARE;
		}
		else {
			this.symbol = ValueSymbol.SQUARE;
		}

		//fix section position if it has only one position
		if(this.position.start && !Number.isNumber(this.position.stop)) {
			this.position.stop = this.position.start;
		}
		if(this.position.stop && !Number.isNumber(this.position.start)) {
			this.position.start = this.position.stop;
		}

		//keep only valid values
		const values = (config.values || []).filter(value => {
			if(!value.date_string) {
				console.error(`Exclude value from section [${this.id}] because it does not have any date`);
				return false;
			}
			//transform date from string to object
			value.date = new Date(value.date_string);
			if(!Date.isValidDate(value.date)) {
				throw new Error(`Invalid date ${value.date_string} in section ${this.id}`);
			}

			//build timeframe for period and bar
			if([GraphType.PERIOD, GraphType.BAR].includes(this.type)) {
				if(!value.end_date_string) {
					console.error(`Exclude value from section [${this.id}] because it does not have an end date`);
					return false;
				}
				//transform date from string to object
				value.end_date = new Date(value.end_date_string);
				if(!Date.isValidDate(value.end_date)) {
					throw new Error(`Invalid end date ${value.end_date_string} in section ${this.id}`);
				}
				//pick value only if the timeframe is valid
				if(value.end_date.isBefore(value.date)) {
					console.error(`Exclude value from section [${this.id}] because it has an invalid timeframe (end date is before begin date)`);
					return false;
				}
				value.timeframe = new Timeframe(value.date, value.end_date);
			}
			return true;
		});
		//sort values
		values.sort(value_comparator);
		this.values = values;

		//manage section references
		this.references = (config.references || []).map(r => new Reference(this, r));
	}

	init() {
		this.references.forEach(r => r.init());
	}

	getLocalizedLabel() {
		//labels in configuration have only the first part of the locale
		const language = this.timeline.locale.substring(0, 2);
		return this.label[language];
	}

	getLocalizedTooltip() {
		//labels in configuration have only the first part of the locale
		const language = this.timeline.locale.substring(0, 2);
		return this.tooltip ? this.tooltip[language] : '';
	}

	getOffset() {
		return this.position ? this.timeline.graphsHeight * (1 - this.position.stop / 100) : 0;
	}

	getHeight() {
		return this.position ? this.timeline.graphsHeight * (this.position.stop - this.position.start) / 100 : this.timeline.graphsHeight;
	}
}
