function reset_fields(date, until_unit) {
	const reset_date = date.clone();
	for(let i = TimeUnits.length - 1; i >= 0; i--) {
		const unit = TimeUnits[i];
		if(unit === until_unit) {
			break;
		}
		reset_date.setUnitValue(unit, unit.start);
	}
	return reset_date;
}

const TimeUnit = {
	YEARS: {
		name: 'YEARS',
		interests: [50, 20, 10, 5, 2, 1],
		previous_interesting: date => reset_fields(date, TimeUnit.YEARS)
	},
	MONTHS: {
		name: 'MONTHS',
		start: 0,
		interests: [12, 6, 3, 2, 1],
		previous_interesting: (d, interest) => {
			const date = reset_fields(d, TimeUnit.MONTHS);
			while(date.getUTCMonth() % interest !== 0) {
				date.setUTCMonth(date.getUTCMonth() - 1);
			}
			return date;
		}
	},
	DAYS: {
		name: 'DAYS',
		start: 1,
		interests: [14, 7, 2, 1],
		previous_interesting: (d, interest) => {
			const date = reset_fields(d, TimeUnit.DAYS);
			while(date.getUTCDate() % interest !== 0) {
				date.setUTCDate(date.getUTCDate() - 1);
			}
			return date;
		}
	},
	HOURS: {
		name: 'HOURS',
		start: 0,
		interests: [12, 6, 3, 2, 1],
		previous_interesting: (d, interest) => {
			const date = reset_fields(d, TimeUnit.HOURS);
			while(date.getUTCHours() % interest !== 0) {
				date.setUTCHours(date.getUTCHours() - 1);
			}
			return date;
		}
	},
	MINUTES: {
		name: 'MINUTES',
		start: 0,
		interests: [60, 30, 15, 5, 1],
		previous_interesting: (d, interest) => {
			const date = reset_fields(d, TimeUnit.MINUTES);
			while(date.getUTCMinutes() % interest !== 0) {
				date.setUTCMinutes(date.getMinutes() - 1);
			}
			return date;
		}
	},
	SECONDS: {
		name: 'SECONDS',
		start: 0,
		interests: [60, 30, 15, 5, 1],
		previous_interesting: (d, interest) => {
			const date = d.clone();
			while(date.getUTCSeconds() % interest !== 0) {
				date.setUTCSeconds(date.getSeconds() - 1);
			}
			return date;
		}
	},
	MILLISECONDS: {
		name: 'MILLISECONDS',
		start: 0,
		interests: [1000, 500, 200, 150, 100, 50, 10, 1],
		previous_interesting: (d, interest) => {
			const date = d.clone();
			while(date.getUTCMilliseconds() % interest !== 0) {
				date.setUTCMilliseconds(date.getUTCMilliseconds() - 1);
			}
			return date;
		}
	}
};

const TimeUnits = [TimeUnit.YEARS, TimeUnit.MONTHS, TimeUnit.DAYS, TimeUnit.HOURS, TimeUnit.MINUTES, TimeUnit.SECONDS, TimeUnit.MILLISECONDS];

Date.prototype.getUnitValue = function(unit) {
	switch(unit) {
		case TimeUnit.YEARS:
			return this.getUTCFullYear();
		case TimeUnit.MONTHS:
			return this.getUTCMonth();
		case TimeUnit.DAYS:
			return this.getUTCDate();
		case TimeUnit.HOURS:
			return this.getUTCHours();
		case TimeUnit.MINUTES:
			return this.getUTCMinutes();
		case TimeUnit.SECONDS:
			return this.getUTCSeconds();
		case TimeUnit.MILLISECONDS:
			return this.getUTCMilliseconds();
	}
	throw new Error(`Unit ${unit.name} is not supported`);
};

Date.prototype.getUnitValueLabel = function(unit, locale) {
	const value = this.getUnitValue(unit);
	switch(unit) {
		case TimeUnit.SECONDS:
			return this.getUTCSeconds().pad(2);
		case TimeUnit.MINUTES:
			return this.getUTCMinutes().pad(2);
		case TimeUnit.HOURS:
			return `${this.getUTCHours().pad(2)}:${this.getMinutes().pad(2)}`;
		case TimeUnit.DAYS:
			return `${this.getUTCDate()}`;
		case TimeUnit.MONTHS:
			return `${this.toLocaleString(locale, {month: 'short'})}`;
		default:
			return value.toString();
	}
};

Date.prototype.getFullUnitValueLabel = function(unit, locale) {
	const value = this.getUnitValue(unit);
	switch(unit) {
		case TimeUnit.SECONDS:
			return this.getUTCSeconds().pad(2);
		case TimeUnit.MINUTES:
			return `${this.getUTCHours().pad(2)}:${this.getMinutes().pad(2)}`;
		case TimeUnit.HOURS:
			return `${this.getUTCHours().pad(2)}:${this.getMinutes().pad(2)}`;
		case TimeUnit.DAYS:
			return `${this.getUTCDate()} ${this.toLocaleString(locale, {month: 'short'})}`;
		case TimeUnit.MONTHS:
			return `${this.toLocaleString(locale, {month: 'short'})} ${this.getUTCFullYear()}`;
		default:
			return value.toString();
	}
};

Date.prototype.toUTCUnitDisplay = function(unit) {
	let label = this.getUTCFullYear().toString();
	if(TimeUnits.indexOf(unit) >= TimeUnits.indexOf(TimeUnit.MONTHS)) {
		label += '-';
		label += (this.getUTCMonth() + 1).pad(2);
	}
	if(TimeUnits.indexOf(unit) >= TimeUnits.indexOf(TimeUnit.DAYS)) {
		label += '-';
		label += this.getUTCDate().pad(2);
	}
	if(TimeUnits.indexOf(unit) >= TimeUnits.indexOf(TimeUnit.MINUTES)) {
		label += ` ${this.getUTCHours().pad(2)}:${this.getUTCMinutes().pad(2)}`;
	}
	if(TimeUnits.indexOf(unit) >= TimeUnits.indexOf(TimeUnit.SECONDS)) {
		label += ':';
		label += this.getUTCSeconds().pad(2);
	}
	if(TimeUnits.indexOf(unit) >= TimeUnits.indexOf(TimeUnit.MILLISECONDS)) {
		label += '.';
		label += this.getUTCMilliseconds().pad(3);
	}
	return label;
};

Date.prototype.setUnitValue = function(unit, value) {
	switch(unit) {
		case TimeUnit.YEARS:
			return this.setUTCFullYear(value);
		case TimeUnit.MONTHS:
			return this.setUTCMonth(value);
		case TimeUnit.DAYS:
			return this.setUTCDate(value);
		case TimeUnit.HOURS:
			return this.setUTCHours(value);
		case TimeUnit.MINUTES:
			return this.setUTCMinutes(value);
		case TimeUnit.SECONDS:
			return this.setUTCSeconds(value);
		case TimeUnit.MILLISECONDS:
			return this.setUTCMilliseconds(value);
	}
	throw new Error(`Unit ${unit.name} is not supported`);
};

Date.prototype.addDuration = function(unit, value) {
	switch(unit) {
		case TimeUnit.YEARS:
			return this.addYears(value);
		case TimeUnit.MONTHS:
			return this.addMonths(value);
		case TimeUnit.DAYS:
			return this.addDays(value);
		case TimeUnit.HOURS:
			return this.addHours(value);
		case TimeUnit.MINUTES:
			return this.addMinutes(value);
		case TimeUnit.SECONDS:
			return this.addSeconds(value);
		case TimeUnit.MILLISECONDS:
			return this.addMilliseconds(value);
	}
	throw new Error(`Unit ${unit.name} is not supported`);
};

export {TimeUnit, TimeUnits};
