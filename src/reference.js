/**
 * A reference curve or set of entries attached to a Section and anchored to
 * another (referenced) section's first value.
 */
export class Reference {
	section;
	entries = [];
	valid = false;

	/**
	 * Build a Reference from a raw configuration object.
	 * @param {object} section - Owning section.
	 * @param {import("./types.js").ReferenceConfig} config - Raw reference configuration object.
	 */
	constructor(section, config) {
		this.section = section;

		//copy properties
		this.label = config.label;
		this.tooltip = config.tooltip;
		this.entries = config.entries;
		this.referenceSectionId = config.referenceSectionId;
		this.color = config.color;
	}

	/**
	 * Resolve the reference date from the referenced section and compute entry dates.
	 * Must be invoked after the referenced section's values have been sorted so the
	 * oldest reference date can be retrieved.
	 * @returns {void}
	 * @throws {Error} When the referenced section id does not resolve to an existing section.
	 */
	init() {
		//retrieve reference date for the reference
		const reference_section = this.section.timeline.getSection(this.referenceSectionId);
		if(!reference_section) {
			throw new Error(`Section ${this.section.id} references nonexistent section ${this.referenceSectionId}`);
		}
		if(!reference_section.values.isEmpty()) {
			this.valid = true;
			const reference_date = reference_section.values[0].date;
			this.entries.forEach(entry => {
				entry.date = reference_date.clone().addTimeString(entry.timepoint);
			});
		}
	}

	/**
	 * Return the reference label localized for the timeline's current locale.
	 * @returns {string} Localized label.
	 */
	getLocalizedLabel() {
		//labels in configuration have only the first part of the locale
		const language = this.section.timeline.locale.substring(0, 2);
		return this.label[language];
	}

	/**
	 * Return the reference tooltip localized for the timeline's current locale.
	 * @returns {string} Localized tooltip text, or an empty string when no tooltip is defined.
	 */
	getLocalizedTooltip() {
		//labels in configuration have only the first part of the locale
		const language = this.section.timeline.locale.substring(0, 2);
		return this.tooltip ? this.tooltip[language] : '';
	}
}
