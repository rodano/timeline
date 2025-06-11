//list of available locales and default locale
const AVAILABLE_LOCALES = ['en-US', 'fr-FR'];
const DEFAULT_LOCALE = AVAILABLE_LOCALES[0];
const LABELS = {
	'en-US': {
		max: 'Max',
		no_data: 'No data',
		periods: 'Periods',
		legend_tooltip: 'Click to show or hide',
		legend_reference_tooltip: 'Click to show or hide references curves',
		download: 'Download',
		fullscreen: 'Fullscreen'
	},
	'fr-FR': {
		max: 'Max',
		no_data: 'Pas de données',
		choose_period: 'Périodes',
		legend_tooltip: 'Cliquer pour afficher ou masquer',
		legend_reference_tooltip: 'Cliquer pour afficher ou masquer les courbes de référence',
		download: 'Télécharger',
		fullscreen: 'Plein écran'
	}
};


export function LocaleOrDefault(locale) {
	return locale && AVAILABLE_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function GetLabel(string, locale) {
	const label = LABELS[locale][string];
	if(label) {
		return label;
	}
	//no label has been found for language (label translation may be missing)
	return LABELS[DEFAULT_LOCALE][string];
}
