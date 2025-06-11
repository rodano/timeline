import {Timeline} from'../src/timeline.js';

async function load(config) {
	const response = await fetch(config);
	return await response.json();
}

window.addEventListener('load', async () => {
	new Timeline(document.getElementById('graph1'), await load('data1.json'), 'fr-FR').draw();
	new Timeline(document.getElementById('graph2'), await load('data2.json'), 'en-US').draw();
	new Timeline(document.getElementById('graph3'), await load('data3.json'), 'en-US').draw();
	new Timeline(document.getElementById('graph4'), await load('data4.json'), 'en-US').draw();
});
