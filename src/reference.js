export class Reference {
	section;
	entries = [];
	valid = false;
	constructor(section, config) {
		this.section = section;

		//copy properties
		this.label = config.label;
		this.tooltip = config.tooltip;
		this.entries = config.entries;
		this.referenceSectionId = config.referenceSectionId;
		this.color = config.color;
	}

	//this must happen after sections values have been sorted to be sure to retrieve the oldest reference date
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

	getLocalizedLabel() {
		//labels in configuration have only the first part of the locale
		const language = this.section.timeline.locale.substring(0, 2);
		return this.label[language];
	}

	getLocalizedTooltip() {
		//labels in configuration have only the first part of the locale
		const language = this.section.timeline.locale.substring(0, 2);
		return this.tooltip ? this.tooltip[language] : '';
	}
}
