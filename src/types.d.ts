interface TimeUnit {
	name: string
	start: number
	interests: number[]
	previous_interesting: (date: Date, interest: number) => Date
}

interface Date {
	getUnitValue(unit: TimeUnit)
	getUnitValueLabel(unit: TimeUnit, locale: string)
	getFullUnitValueLabel(unit: TimeUnit, locale: string)
	toUTCUnitDisplay(unit: TimeUnit)
	setUnitValue(unit: TimeUnit, value: number)
	addDuration(unit: TimeUnit, value: number): Date
}
