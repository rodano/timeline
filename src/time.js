/**
 * A time unit (year, month, day, ...) supported by the timeline.
 *
 * Each unit knows how to reset a Date's finer-grained fields, which
 * "interesting" intervals to consider when picking graduations, and how to
 * snap a Date back to the previous boundary matching a chosen interval.
 * @typedef {object} TimeUnitDefinition
 * @property {string} name - Uppercase identifier of the unit (e.g. "YEARS").
 * @property {number} start - Default value the field takes when reset (e.g. 1 for DAYS, 0 for HOURS).
 * @property {number[]} interests - Ordered list of intervals to consider, from coarsest to finest.
 * @property {(date: Date, interest?: number) => Date} previous_interesting - Snap the given date back to the previous boundary matching the interval.
 */

/**
 * Enumeration of time units used by the timeline. Each entry describes how to
 * snap a Date back to the previous "interesting" boundary for that unit.
 */
const TimeUnit = {
	YEARS: {
		name: 'YEARS',
		start: 0,
		interests: [50, 20, 10, 5, 2, 1],

		/**
		 * Snap the given date back to the start of its year.
		 * @param {Date} date - Reference date.
		 * @returns {Date} A new date snapped to the previous year boundary.
		 */
		previous_interesting: date => reset_fields(date, TimeUnit.YEARS)
	},
	MONTHS: {
		name: 'MONTHS',
		start: 0,
		interests: [12, 6, 3, 2, 1],

		/**
		 * Snap the given date back to the previous month boundary matching the interest.
		 * @param {Date} d - Reference date.
		 * @param {number} interest - Interval in months to snap to.
		 * @returns {Date} A new snapped date.
		 */
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

		/**
		 * Snap the given date back to the previous day boundary matching the interest.
		 * @param {Date} d - Reference date.
		 * @param {number} interest - Interval in days to snap to.
		 * @returns {Date} A new snapped date.
		 */
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

		/**
		 * Snap the given date back to the previous hour boundary matching the interest.
		 * @param {Date} d - Reference date.
		 * @param {number} interest - Interval in hours to snap to.
		 * @returns {Date} A new snapped date.
		 */
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

		/**
		 * Snap the given date back to the previous minute boundary matching the interest.
		 * @param {Date} d - Reference date.
		 * @param {number} interest - Interval in minutes to snap to.
		 * @returns {Date} A new snapped date.
		 */
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

		/**
		 * Snap the given date back to the previous second boundary matching the interest.
		 * @param {Date} d - Reference date.
		 * @param {number} interest - Interval in seconds to snap to.
		 * @returns {Date} A new snapped date.
		 */
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

		/**
		 * Snap the given date back to the previous millisecond boundary matching the interest.
		 * @param {Date} d - Reference date.
		 * @param {number} interest - Interval in milliseconds to snap to.
		 * @returns {Date} A new snapped date.
		 */
		previous_interesting: (d, interest) => {
			const date = d.clone();
			while(date.getUTCMilliseconds() % interest !== 0) {
				date.setUTCMilliseconds(date.getUTCMilliseconds() - 1);
			}
			return date;
		}
	}
};

/**Ordered list of time units, from coarsest (YEARS) to finest (MILLISECONDS). */
const TimeUnits = [TimeUnit.YEARS, TimeUnit.MONTHS, TimeUnit.DAYS, TimeUnit.HOURS, TimeUnit.MINUTES, TimeUnit.SECONDS, TimeUnit.MILLISECONDS];

/**
 * Zero out every date field finer than the given unit, returning a new Date.
 * @param {Date} date - Source date (not mutated).
 * @param {object} until_unit - Time unit down to which fields are preserved.
 * @returns {Date} A cloned date with finer-grained fields reset to their default value.
 */
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

/**
 * Return the UTC field value corresponding to the given time unit.
 * @param {object} unit - Target time unit.
 * @returns {number} The UTC value for the requested unit.
 * @throws {Error} When the unit is not supported.
 */
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

/**
 * Return a short, human-readable label for the given time unit value.
 * @param {object} unit - Target time unit.
 * @param {string} locale - Locale used for month formatting.
 * @returns {string} A localized short label.
 */
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

/**
 * Return a longer, human-readable label for the given time unit value.
 * @param {object} unit - Target time unit.
 * @param {string} locale - Locale used for month formatting.
 * @returns {string} A localized long label.
 */
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

/**
 * Format the date as a UTC ISO-like string truncated at the given unit.
 * @param {object} unit - Finest unit to include in the output.
 * @returns {string} Formatted UTC date string.
 */
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

/**
 * Set the UTC field of this date corresponding to the given time unit.
 * @param {object} unit - Target time unit.
 * @param {number} value - New value for the field.
 * @returns {number} The result of the underlying set* call (updated timestamp).
 * @throws {Error} When the unit is not supported.
 */
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

/**
 * Add a duration expressed as a number of units to this date.
 * @param {object} unit - Unit of the duration to add.
 * @param {number} value - Amount of units to add.
 * @returns {Date} The mutated date (as returned by the underlying add* helper).
 * @throws {Error} When the unit is not supported.
 */
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
