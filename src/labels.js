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


/**
 * Return the given locale if supported, otherwise fall back to the default locale.
 * @param {string | undefined} locale - Candidate locale (BCP 47 tag).
 * @returns {string} A supported locale identifier.
 */
export function LocaleOrDefault(locale) {
	return locale && AVAILABLE_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

/**
 * Look up a UI label for the given key and locale, falling back to the default locale.
 * @param {string} string - Label key to translate.
 * @param {string} locale - Locale to look the label up for.
 * @returns {string} The translated label, or the default locale label as fallback.
 */
export function GetLabel(string, locale) {
	const label = LABELS[locale][string];
	if(label) {
		return label;
	}
	//no label has been found for language (label translation may be missing)
	return LABELS[DEFAULT_LOCALE][string];
}
