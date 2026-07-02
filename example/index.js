import {Timeline} from '../src/timeline.js';

/**
 * Fetch a JSON configuration file and return its parsed contents.
 * @param {string} config_name - URL of the JSON configuration file.
 * @returns {Promise<object>} The parsed configuration.
 */
async function load(config_name) {
	const response = await fetch(config_name);
	const config = await response.json();
	enhance_config(config);
	return config;
}

/**
 * Enhance a base configuration object by adding the URL of the link associated with a value
 * @param {import("../src/types.js").TimelineConfig} config - A timeline configuration object.
 */
function enhance_config(config) {
	(config.sections ?? []).forEach(section => {
		(section.values ?? []).forEach(value => {
			if(value.metadata) {
				if(value.metadata.scopePk) {
					let link = `#/${value.metadata.scopePk}`;
					if(value.metadata.visitPk) {
						link += `/${value.metadata.visitPk}`;
					}
					if(value.metadata.formPk) {
						link += `/${value.metadata.formPk}`;
					}
					value.link = link;
				}
			}
		});
	});
}

window.addEventListener('load', async() => {
	new Timeline(document.getElementById('graph1'), await load('data1.json'), 'fr-FR').draw();
	new Timeline(document.getElementById('graph2'), await load('data2.json'), 'en-US').draw();
	new Timeline(document.getElementById('graph3'), await load('data3.json'), 'en-US').draw();
	new Timeline(document.getElementById('graph4'), await load('data4.json'), 'en-US').draw();
});
