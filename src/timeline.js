import '@matco/basic-tools/extension.js';
import '@matco/basic-tools/dom_extension.js';

import {UUID} from '@matco/basic-tools/uuid.js';
import {Timeframe} from '@matco/basic-tools/timeframe.js';
import {SVG} from '@matco/basic-tools/svg.js';
import {LocaleOrDefault, GetLabel} from './labels.js';
import {GraphType} from './graph_type.js';
import {TimeUnit, TimeUnits} from './time.js';
import {Section} from './section.js';

function get_timeframe_amount(timeframe, unit) {
	switch(unit) {
		case TimeUnit.YEARS:
			return timeframe.getDays() / 30.5 / 12;
		case TimeUnit.MONTHS:
			return timeframe.getDays() / 30.5;
		case TimeUnit.DAYS:
			return timeframe.getDays();
		case TimeUnit.HOURS:
			return timeframe.getHours();
		case TimeUnit.MINUTES:
			return timeframe.getMinutes();
		case TimeUnit.SECONDS:
			return timeframe.getSeconds();
		case TimeUnit.MILLISECONDS:
			return timeframe.getMilliseconds();
	}
	throw new Error(`Unit ${unit.name} is not supported`);
}

function get_time_frame_for_sections(sections) {
	let start_date;
	let stop_date;
	sections.forEach(section => {
		section.values.forEach(value => {
			if(!start_date || start_date > value.date) {
				start_date = value.date.clone();
			}
			if(!stop_date || stop_date < value.date) {
				stop_date = value.date.clone();
			}
			//take end date in consideration
			if(stop_date < value.end_date) {
				stop_date = value.end_date.clone();
			}
		});
	});
	if(!start_date || !stop_date) {
		throw new Error('No data to find timeframe');
	}
	return new Timeframe(start_date, stop_date);
}

/**
 *
 * @param {*} unit The time unit used to perform the calculation
 * @param {*} amount The amount of time of this unit
 * @param {*} slots The number of available slots
 * @returns
 */
function get_unit_interval(unit, amount, slots) {
	//sort unit interests from biggest to smallest to find the smallest interesting interest
	const interests = [...unit.interests].sort((a, b) => a - b).reverse();
	//if the amount is so big that even when displaying it with the biggest interval, it exceeds the number of slots, do not display this unit
	if((amount / interests[0]) > slots) {
		return undefined;
	}
	//theoretical interval is simply the amount divided by the number of slots
	const interval = amount / slots;
	//find the interesting interval that allows to display all the data in the available slots
	let i = 1;
	while(interval < interests[i] && i < interests.length) {
		i++;
	}
	return interests[i - 1];
}

function get_unit_intervals(timeframe, slots) {
	const entries = [...TimeUnits].reverse()
		.map(unit => {
			const amount = get_timeframe_amount(timeframe, unit);
			return [unit.name, get_unit_interval(unit, amount, slots)];
		});
	return Object.fromEntries(entries);
}

function is_position_undefined(section) {
	return !Number.isNumber(section?.position?.start);
}

function section_comparator(section_1, section_2) {
	if(is_position_undefined(section_1) && is_position_undefined(section_2)) {
		return section_1.id.compareTo(section_2.id);
	}
	if(is_position_undefined(section_1)) {
		return -1;
	}
	if(is_position_undefined(section_2)) {
		return 1;
	}
	return section_2.position.start - section_1.position.start;
}

//configuration
//global margin (do not use HTML padding on SVG element because this will be lost when an image is generated)
const MARGIN = 10;
//margin between graphs and scroller
const SCROLLER_MARGIN = 70;
//height for periods
const SCROLLER_PERIODS_HEIGHT = 25;
//width of y-axis scales on both sides of the graph
const GRADUATION_PADDING = 40;
//time margin around data
const TIME_MARGIN_PERCENTAGE = 10;
//arbitrary time frame when only a single date is displayed
const SINGLE_DATE_EXTENSION_SECONDS = 30;

function add_margin(t) {
	const timeframe = t.clone().extendPercentage(TIME_MARGIN_PERCENTAGE);
	//if the timeframe is limited to a single date, extends the timeframe by an arbitrary amount
	if(timeframe.isBlank()) {
		timeframe.extendSeconds(SINGLE_DATE_EXTENSION_SECONDS);
	}
	return timeframe;
}

export class Timeline {

	constructor(container, config, locale) {
		if(!Object.isObject(config)) {
			throw new Error('Configuration parameter must be an object');
		}
		this.container = container;
		this.config = config;
		this.locale = LocaleOrDefault(locale);

		//generate unique id that will be used as a prefix to allow the display of multiple graphs in one HTML page
		//this id should start with a letter to match HTML 4 specifications
		this.uuid = `i${UUID.Generate()}`;

		const sections = this.config.sections.map(s => new Section(this, s));
		//sort sections according to their position
		sections.sort(section_comparator);
		this.sections = sections;

		//manage position of section scales
		//keep a rank for each scale and each side
		const section_scale_ranks = {};
		this.sections
			.filter(s => s.scale && Number.isNumber(s.position?.start))
			.forEach(section => {
				const section_position = section.position.start;
				//initialize scale ranks object for this position if required
				if(!section_scale_ranks.hasOwnProperty(section_position)) {
					section_scale_ranks[section_position] = {LEFT: 0, RIGHT: 0};
				}
				section.scale.rank = ++section_scale_ranks[section_position][section.scale.position];
			});

		//create and initialize state objet
		this.state = {
			data: {
				timeframe: add_margin(get_time_frame_for_sections(this.sections)),
				scale: undefined
			},
			visible: {
				timeframe: undefined,
				scale: undefined
			}
		};

		//manage periods
		this.config.periods.forEach(period => {
			const timeframe = add_margin(new Timeframe(new Date(period.start_date_string), new Date(period.stop_date_string)));
			period.timeframe = this.constrainPeriodToData((timeframe));
			if(!timeframe.equals(period.timeframe)) {
				console.error(`Period ${period.label} has been adjusted because it is outside the data time frame`);
			}
		});
		//add the "maximum" period if there is no configured period that matches
		if(this.config.periods.every(p => !p.timeframe.equals(this.state.data.timeframe))) {
			this.config.periods.unshift({
				label: this.getLabel('max'),
				timeframe: this.state.data.timeframe.clone()
			});
		}

		//redraw graph when window is resized
		if(!this.config.width) {
			window.addEventListener('resize', () => {
				//redraw only if the graph is displayed
				if(this.container.offsetParent) {
					this.redraw();
				}
			});
		}

		const original_dimension = {width: this.config.width, height: this.config.height};

		document.addEventListener('fullscreenchange', () => {
			if(document.fullscreenElement === this.container) {
				this.container.style.width = '100%';
				this.container.style.height = '100%';
				this.container.style.backgroundColor = 'white';
				this.container.style.padding = '10px';
				//let some time for the browser to redraw the container
				setTimeout(() => {
					this.config.width = this.container.offsetWidth - 20;
					this.config.height = this.container.offsetHeight - 20;
					this.redraw();
				}, 5);
			}
			else {
				this.container.style.width = '';
				this.container.style.height = '';
				this.container.style.backgroundColor = '';
				this.container.style.padding = '';
				this.config.width = original_dimension.width;
				this.config.height = original_dimension.height;
				this.redraw();
			}
		});

		this.init();
	}

	init() {
		this.sections.forEach(s => s.init());
	}

	generateId(id) {
		return `${this.uuid}_${id}`;
	}

	getSection(section_id) {
		return this.sections.find(s => s.id === section_id);
	}

	download() {
		//duplicate svg to be able to add custom styling
		const cloned_svg = /**@type {SVGElement}*/ (this.svg.cloneNode(true));
		cloned_svg.setAttribute('viewBox', `-10 -10 ${this.width + 20} ${this.height + 20}`);
		cloned_svg.setAttribute('width', '1920px');
		cloned_svg.setAttribute('height', '900px');

		//remove useless content
		cloned_svg.querySelectorAll(`[id="${this.generateId('error')}"], [id="${this.generateId('scroller')}"], [id="${this.generateId('periods')}"], .button, .tooltip, .area`).forEach(n => n.parentNode.removeChild(n));

		//adjust style
		cloned_svg.setAttribute('style', 'background-color: white; font-family: sans-serif;');

		//remove filter attribute that is not supported by Firefox when sent to an image
		cloned_svg.querySelectorAll('*').forEach(n => n.removeAttribute('filter'));

		//replace gradient fill by the first color of the gradient
		cloned_svg.querySelectorAll('*').forEach(node => {
			const fill = node.style.fill;
			if(fill.startsWith('url')) {
				//remove quotes from url (some browsers like Chrome or Firefox add quotes around the URL but Edge does not)
				let selector = fill.replace(/"/gi, '');
				selector = selector.substring(selector.indexOf('(') + 1, selector.lastIndexOf(')'));
				const element = document.querySelector(selector);
				node.style.fill = element.firstElementChild.getAttribute('stop-color');
			}
		});

		//insert cloned svg in the DOM to be able to copy CSS rules in style attribute
		this.container.appendChild(cloned_svg);
		//copy only interesting CSS rules
		const interesting_rules = ['font-family', 'font-size', 'stroke', 'stroke-width', 'stroke-dasharray', 'fill', 'opacity'];
		//query selector preserves order
		cloned_svg.querySelectorAll('*').forEach(node => {
			const rules = getComputedStyle(node);
			const styles = interesting_rules.map(rule => {
				const property_value = rules.getPropertyValue(rule);
				const style_value = property_value.replace(/"/g, '\'');
				return `${rule}: ${style_value};`;
			});
			node.setAttribute('style', styles.join(' '));
		});

		const svg_data = (new XMLSerializer()).serializeToString(cloned_svg);
		const svg_blob = new Blob([svg_data], {type: 'image/svg+xml'});
		const svg_url = URL.createObjectURL(svg_blob);

		//cloned svg can now be removed from the DOM
		this.container.removeChild(cloned_svg);

		function blob_generated(blob) {
			const filename = 'timeline.png';
			const file = new File([blob], filename, {type: 'image/octet-stream', lastModified: Date.now()});
			const url = URL.createObjectURL(file);
			//Chrome and Safari don't support to set location href
			if(/Chrome/.test(navigator.userAgent) || /Safari/.test(navigator.userAgent)) {
				const link = document.createFullElement('a', {href: url, download: filename});
				const event = new MouseEvent('click', {bubbles: true, cancelable: true});
				link.dispatchEvent(event);
			}
			else {
				location.href = url;
			}
		}

		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		const image = new Image();
		image.addEventListener(
			'load',
			function() {
				canvas.width = image.width;
				canvas.height = image.height;
				context.drawImage(image, 0, 0);
				URL.revokeObjectURL(svg_url);
				canvas.toBlob(blob_generated, 'image/png');
			}
		);
		image.src = svg_url;
	}

	getMousePosition(event) {
		//retrieve position of the event and the graph relative to the viewport
		const event_x = event.touches ? event.touches[0].clientX : event.clientX;
		const event_y = event.touches ? event.touches[0].clientY : event.clientY;
		const position = this.svg.getBoundingClientRect();
		return [event_x - position.left, event_y - position.top];
	}

	//update tooltip size and position
	updateTooltip(event) {
		//show to initialize bbox
		this.tooltip.style.display = 'block';
		const content = /**@type {SVGGraphicsElement}*/ (this.tooltip.lastElementChild.firstElementChild);
		const bbox = content.getBBox();
		const width = bbox.width + 8;
		const height = bbox.height + 8;
		this.tooltip.firstElementChild.setAttributeNS(null, 'width', width.toString());
		this.tooltip.firstElementChild.setAttributeNS(null, 'height', height.toString());
		const [coordinate_x, coordinate_y] = this.getMousePosition(event);
		const x_position = (coordinate_x + 20 + width) > this.width ? coordinate_x - 15 - width : (coordinate_x + 15);
		this.tooltip.setAttributeNS(null, 'transform', `translate(${x_position} ${coordinate_y + 15})`);
	}

	hideTooltip() {
		this.tooltip.style.display = 'none';
	}

	redraw() {
		//remove existing svg to reset the size of the container
		//otherwise, container will keep its size because the svg inside has its size enforced
		this.container.removeChild(this.svg);
		this.draw();
	}

	draw() {
		const that = this;

		//create svg
		this.svg = SVG.Create({class: 'timeline'});

		//calculate size
		const right_ranks = Math.max(0, ...this.sections.map(s => s.scale?.rank || 0));

		//if size has not been specified in graph configuration, fill the HTML container
		this.width = this.config.width || this.container.offsetWidth - 10;
		this.height = this.config.height;

		//set graph min width
		const min_width = this.config.legendWidth + MARGIN * 2 + GRADUATION_PADDING * right_ranks + 100;
		this.width = Math.max(this.width, min_width);

		//calculate graph size
		this.graphsWidth = this.width - this.config.legendWidth - MARGIN * 2 - GRADUATION_PADDING * right_ranks;
		this.graphsHeight = this.height - this.config.scrollerHeight - SCROLLER_MARGIN - SCROLLER_PERIODS_HEIGHT - MARGIN * 2;

		//resize svg
		this.svg.setAttribute('width', `${this.width}px`);
		this.svg.setAttribute('height', `${this.height}px`);

		//add svg
		this.container.appendChild(this.svg);

		//buttons
		const buttons = SVG.Group({transform: `translate(${MARGIN + this.config.legendWidth / 2},${this.height - MARGIN - 10})`,});
		this.svg.appendChild(buttons);

		//download
		const download = SVG.Group({class: 'button'});
		buttons.appendChild(download);
		//create label
		const label = SVG.Text(0, 0, this.getLabel('download'), {'text-anchor': 'middle'});
		download.appendChild(label);
		//create background
		//when retrieving the bbox, the font may still not have been loaded
		//in this case, the bbox will return with the size of the text with the default font, which will be wrong
		//to mitigate this, the text is center in its box with "text-anchor=middle" and more space is added around the text
		const box = label.getBBox();
		const background = SVG.Rectangle(-(box.width / 2 + 8), - box.height, box.width + 2 * 8, box.height + 8);
		download.appendChild(background);
		//make text go over
		download.appendChild(label);
		download.addEventListener('click', () => this.download());

		//reset state
		this.state.data.scale = this.graphsWidth / this.state.data.timeframe.getMilliseconds();
		this.state.visible = {
			timeframe: undefined,
			scale: undefined
		};

		//fullscreen
		if(document.fullscreenElement !== this.container) {
			const fullscreen = SVG.Group({transform: 'translate(0,-30)', class: 'button'});
			buttons.appendChild(fullscreen);
			//create label
			const fullscreen_label = SVG.Text(0, 0, this.getLabel('fullscreen'), {'text-anchor': 'middle'});
			fullscreen.appendChild(fullscreen_label);
			//create background
			//when retrieving the bbox, the font may still not have been loaded
			//in this case, the bbox will return with the size of the text with the default font, which will be wrong
			//to mitigate this, the text is center in its box with "text-anchor=middle" and more space is added around the text
			const fullscreen_box = fullscreen_label.getBBox();
			const fullscreen_background = SVG.Rectangle(-(fullscreen_box.width / 2 + 8), - fullscreen_box.height, fullscreen_box.width + 2 * 8, fullscreen_box.height + 8);
			fullscreen.appendChild(fullscreen_background);
			//make text go over
			fullscreen.appendChild(fullscreen_label);
			fullscreen.addEventListener('click', async () => await this.container.requestFullscreen());
		}

		//defs
		const defs = SVG.Element('defs');
		this.svg.appendChild(defs);

		//gradients
		this.sections
			.filter(s => s.references.length > 1)
			.forEach(section => {
				const gradient = SVG.Element('linearGradient', {id: this.generateId(`gradient_${section.id}`), x1: '0', x2: '0', y1: '0', y2: '100%'});
				gradient.appendChild(SVG.Element('stop', {offset: '0', 'stop-color': section.references.first().color}));
				gradient.appendChild(SVG.Element('stop', {offset: '100%', 'stop-color': section.references.last().color}));
				defs.appendChild(gradient);
			});

		//clips
		//scroller clip
		const scroller_grading_container_clip = SVG.Element('clipPath', {id: this.generateId('scroller_grading_container_clip')});
		scroller_grading_container_clip.appendChild(SVG.Rectangle(0, 0, this.graphsWidth, this.config.scrollerHeight));
		defs.appendChild(scroller_grading_container_clip);
		//graphs clip
		/*const graphs_container_clip = SVG.Element('clipPath', {id : 'graphs_container_clip'});
		graphs_container_clip.appendChild(SVG.Rectangle(0, 0, this.graphsWidth, this.graphsHeight + Timeline.SCROLLER_MARGIN));
		defs.appendChild(graphs_container_clip);*/

		//filters
		//shadow
		const filter_shadow = SVG.Element('filter', {id: this.generateId('filter_shadow')});
		filter_shadow.appendChild(SVG.Element('feGaussianBlur', {in: 'SourceAlpha', stdDeviation: 2}));
		filter_shadow.appendChild(SVG.Element('feOffset', {dx: 3, dy: 3}));
		const filter_shadow_merge = SVG.Element('feMerge');
		filter_shadow_merge.appendChild(SVG.Element('feMergeNode'));
		filter_shadow_merge.appendChild(SVG.Element('feMergeNode', {in: 'SourceGraphic'}));
		filter_shadow.appendChild(filter_shadow_merge);
		defs.appendChild(filter_shadow);
		//light shadow
		const filter_light_shadow = SVG.Element('filter', {id: this.generateId('filter_light_shadow')});
		filter_light_shadow.appendChild(SVG.Element('feGaussianBlur', {in: 'SourceAlpha', stdDeviation: 1}));
		filter_light_shadow.appendChild(SVG.Element('feOffset', {dx: 1, dy: 1}));
		const filter_light_shadow_merge = SVG.Element('feMerge');
		filter_light_shadow_merge.appendChild(SVG.Element('feMergeNode'));
		filter_light_shadow_merge.appendChild(SVG.Element('feMergeNode', {in: 'SourceGraphic'}));
		filter_light_shadow.appendChild(filter_light_shadow_merge);
		defs.appendChild(filter_light_shadow);
		//handle
		const scroller_handle = SVG.Group({id: this.generateId('scroller_handle'), style: 'cursor: e-resize;'});
		scroller_handle.appendChild(SVG.Line(3, 0, 3, this.config.scrollerHeight, {stroke: '#333'}));
		scroller_handle.appendChild(SVG.Rectangle(0, this.config.scrollerHeight / 4, 6, this.config.scrollerHeight / 2, {stroke: '#333', fill: 'white', rx: 2, ry: 2}));
		scroller_handle.appendChild(SVG.Line(2, this.config.scrollerHeight / 4 + 2, 2, 0.75 * this.config.scrollerHeight - 2, {stroke: '#333'}));
		scroller_handle.appendChild(SVG.Line(4, this.config.scrollerHeight / 4 + 2, 4, 0.75 * this.config.scrollerHeight - 2, {stroke: '#333'}));
		defs.appendChild(scroller_handle);

		//containers
		//graphs
		this.graphsContainer = SVG.Group({id: this.generateId('graphs'), transform: `translate(${this.config.legendWidth + MARGIN},${MARGIN})`});
		//scroll the graph with the mouse wheel
		this.graphsContainer.addEventListener(
			'wheel',
			event => {
				//stop the scroll event so the page is not scrolled
				event.stop();
				//hide the tooltip manually because the mouseout event (hiding the tooltip) is not triggered when an element is scrolled
				//due to this, the tooltip could still be displayed while the pointer is no longer over the tool-tipped element
				this.hideTooltip();
				//consider all scroll directions (some mouse have horizontal scrolling, some don't)
				const scroll = event.deltaY || event.deltaX;
				//we don't care about the absolute value of the delta, only it sign
				//whatever the scroll value, shift the period by 5 percents
				const offset_seconds = (this.state.visible.timeframe.getMilliseconds() / 100) * 5 * Math.sign(scroll);
				this.setPeriod(this.state.visible.timeframe.clone().shiftMilliseconds(offset_seconds));
			},
			{passive: false}
		);
		this.svg.appendChild(this.graphsContainer);

		//graph x-axis clip
		const graphs_xaxis_clip = SVG.Element('clipPath', {id: this.generateId('graphs_xaxis_clip')});
		graphs_xaxis_clip.appendChild(SVG.Rectangle(0, this.graphsHeight, this.graphsWidth, SCROLLER_MARGIN));
		this.graphsContainer.appendChild(graphs_xaxis_clip);

		//graph clip
		const graphs_clip = SVG.Element('clipPath', {id: this.generateId('graphs_clip')});
		graphs_clip.appendChild(SVG.Rectangle(0, 0, this.graphsWidth, this.graphsHeight));
		this.graphsContainer.appendChild(graphs_clip);

		//frame
		this.frame = SVG.Rectangle(0, 0, this.graphsWidth, this.graphsHeight, {class: 'frame'});

		//shift and selection management
		let graph_handle_x;
		let timeframe;
		let selection;
		function start_drag(event) {
			event.stopPropagation();
			graph_handle_x = (event.touches ? event.touches[0].clientX : event.clientX) - that.frame.getBoundingClientRect().x;
			if(event.ctrlKey) {
				selection = SVG.Rectangle(graph_handle_x, 0, 0, that.graphsHeight, {class: 'selection'});
				that.graphsContainer.appendChild(selection);
			}
			else {
				timeframe = that.state.visible.timeframe;
				that.frame.setAttributeNS(null, 'class', 'frame scrolling');
			}
			document.addEventListener('mouseup', stop_drag, {passive: true, once: true});
			document.addEventListener('touchend', stop_drag, {passive: true, once: true});
			document.addEventListener('mousemove', move, {passive: true});
			document.addEventListener('touchmove', move, {passive: true});
		}

		function move(event) {
			event.stopPropagation();
			const event_x = (event.touches ? event.touches[0].clientX : event.clientX) - that.frame.getBoundingClientRect().x;
			//at this time we don't care if the control key is still pressed or not
			//the choice is done during the mouse up event
			if(selection) {
				//for selection, going further than the graph is not allowed
				const event_bound = Math.min(that.graphsWidth, Math.max(0, event_x));
				const translation = graph_handle_x - event_bound;
				selection.setAttribute('x', Math.min(event_bound, graph_handle_x).toString());
				selection.setAttribute('width', Math.abs(translation).toString());
			}
			else {
				//for shifting, going further than the edge of the graph is allowed
				const translation = graph_handle_x - event_x;
				that.setPeriod(timeframe.clone().shiftMilliseconds(translation / that.state.visible.scale));
			}
		}

		function stop_drag(event) {
			event.stopPropagation();
			if(selection) {
				const event_x = (event.touches ? event.touches[0].clientX : event.clientX) - that.frame.getBoundingClientRect().x;
				const translation = graph_handle_x - event_x;
				const start_date = that.state.visible.timeframe.startDate.addMilliseconds(Math.min(event_x, graph_handle_x) / that.state.visible.scale);
				const stop_date = start_date.clone().addMilliseconds(Math.abs(translation) / that.state.visible.scale);
				that.setPeriod(new Timeframe(start_date, stop_date));
				that.graphsContainer.removeChild(selection);
				selection = undefined;
			}
			that.frame.setAttributeNS(null, 'class', 'frame');
			this.removeEventListener('mousemove', move);
			this.removeEventListener('touchmove', move);
			graph_handle_x = undefined;
			timeframe = undefined;
		}

		this.frame.addEventListener('mousedown', start_drag, {passive: true});
		this.frame.addEventListener('touchstart', start_drag, {passive: true});
		this.graphsContainer.appendChild(this.frame);

		//graphs y-axis
		this.yaxisContainer = SVG.Group();
		this.graphsContainer.appendChild(this.yaxisContainer);
		//graphs x-axis
		//two containers are required to avoid the clip to apply on the translated element
		const x_axis_container = SVG.Group({'clip-path': `url(#${this.generateId('graphs_xaxis_clip')}`});
		this.xaxisSubcontainer = SVG.Group({'transform': `translate(0,${this.graphsHeight})`});
		x_axis_container.appendChild(this.xaxisSubcontainer);
		this.graphsContainer.appendChild(x_axis_container);
		//graphs
		//same here
		const graphs_container = SVG.Group({'clip-path': `url(#${this.generateId('graphs_clip')})`});
		this.graphsSubcontainer = SVG.Group();
		graphs_container.appendChild(this.graphsSubcontainer);
		this.graphsContainer.appendChild(graphs_container);

		//error frame
		this.errorFrame = SVG.Group({id: this.generateId('error'), transform: `translate(${this.config.legendWidth + MARGIN},${MARGIN})`, style: 'display: none;'});
		this.errorFrame.appendChild(SVG.Rectangle(0, 0, this.graphsWidth, this.graphsHeight, {class: 'error_frame'}));
		this.errorFrame.appendChild(SVG.Rectangle(this.graphsWidth / 2 - 40, this.graphsHeight / 2 - 15, 80, 30, {rx: '2', ry: '2', 'stroke-width': 0, fill: '#bbb', opacity: 0.8}));
		this.errorFrame.appendChild(SVG.Text(this.graphsWidth / 2 - 30, this.graphsHeight / 2 + 5, this.getLabel('no_data'), {lengthAdjust: 'spacing', fill: 'white'}));
		this.svg.appendChild(this.errorFrame);

		//legends
		function manage_toggle_section(event) {
			event.stop();
			that.errorFrame.style.display = 'none';
			const id = this.getAttribute('data-section-id');
			const section = that.getSection(id);
			if(!section.hidden) {
				//one visible section must remain
				if(that.sections.some(s => !s.hidden && s.id !== id)) {
					section.hidden = true;
					this.style.opacity = 0.4;
				}
			}
			else {
				section.hidden = false;
				this.style.opacity = 1;
			}
			//update graphs every time
			that.drawGraphs();
		}

		function manage_toggle_reference(event) {
			event.stop();
			that.errorFrame.style.display = 'none';
			const id = this.getAttribute('data-section-id');
			const section = that.getSection(id);
			if(!section.hidden) {
				if(!section.referencesHidden) {
					section.referencesHidden = true;
					this.style.opacity = 0.4;
				}
				else {
					section.referencesHidden = false;
					this.style.opacity = 1;
				}
				//update graphs every time
				that.drawGraphs();
			}
		}

		//legends
		const legends_container = SVG.Group({id: this.generateId('legends'), transform: `translate(${MARGIN},${MARGIN})`, class: 'legends'});
		this.svg.appendChild(legends_container);

		const legend_positions = [];
		this.sections
			.filter(s => !s.hiddenLegend)
			.forEach(section => {
				//find legend position
				let y_position;
				//fixed sections with position
				if(section.position) {
					y_position = section.getOffset();
					//center legend vertically
					//y_position += (section.getHeight() / 2);
				}
				//action sections without position
				else {
					y_position = 0;
				}
				//offset position if there is already a legend next to this place
				let placed = false;
				while(!placed) {
					placed = !legend_positions.find(p => Math.abs(p - y_position) < 20);
					//increment position
					if(!placed) {
						y_position += 1;
					}
				}
				//add new position to array
				legend_positions.push(y_position);

				//create legend group
				const legend_group = SVG.Group({id: `legend_${section.id}`, style: 'cursor: pointer;', 'data-section-id': section.id});
				legend_group.addEventListener('click', manage_toggle_section);
				if(section.hidden) {
					legend_group.style.opacity = '0.4';
				}
				//correction of position to avoid blurry text
				legend_group.setAttributeNS(null, 'transform', `translate(0,${Math.round(y_position)})`);
				legends_container.appendChild(legend_group);

				//create legend section group
				const legend_section_group = SVG.Group({'data-tooltip-text': that.getLabel('legend_tooltip'), 'data-tooltip-color': section.color});
				legend_group.appendChild(legend_section_group);
				hook_tooltip(legend_section_group);

				//add legend section content
				legend_section_group.appendChild(section.symbol.create(0, 8, 1, {style: `fill:${section.color}; ` + `stroke-width: 1; stroke: ${section.color};`}));
				const legend_label = SVG.Text(15, 12, section.getLocalizedLabel(), {class: 'legend'});
				legend_section_group.appendChild(legend_label);
				SVG.TextWrap(legend_label, that.config.legendWidth - 50);

				//section reference labels
				const references = section.references.filter(r => r.valid);
				if(!references.isEmpty()) {
					//create dedicated group for section references
					const legend_group_references = SVG.Group({style: 'cursor: pointer;', 'data-section-id': section.id});
					legend_group_references.addEventListener('click', manage_toggle_reference);
					if(section.hidden || section.referencesHidden) {
						legend_group_references.style.opacity = '0.4';
					}
					legend_group.appendChild(legend_group_references);

					references.forEach((reference, reference_index) => {
						//calculate position and add new position to array
						const reference_position = (reference_index + 1) * 20;
						legend_positions.push(y_position + reference_position);

						//create legend section reference group
						const legend_reference_group = SVG.Group({'data-tooltip-text': that.getLabel('legend_reference_tooltip'), 'data-tooltip-color': reference.color});
						legend_group_references.appendChild(legend_reference_group);
						hook_tooltip(legend_reference_group);

						//add legend section reference content
						legend_reference_group.appendChild(section.symbol.create(10, reference_position + 8, 1, {style: `fill:${reference.color}; ` + `stroke-width: 1; stroke: ${reference.color};`}));
						const legend_reference_label = SVG.Text(25, reference_position + 12, reference.getLocalizedLabel(), {class: 'legend'});
						legend_reference_group.appendChild(legend_reference_label);
						SVG.TextWrap(legend_reference_label, that.config.legendWidth - 50);
					});
				}
			});

		//periods
		if(this.config.periods.length > 1) {
			this.periodsContainer = SVG.Group({id: this.generateId('periods'), transform: `translate(${that.config.legendWidth + MARGIN},${this.config.height - this.config.scrollerHeight - MARGIN - SCROLLER_PERIODS_HEIGHT})`, class: 'periods'});
			this.svg.appendChild(this.periodsContainer);

			this.periodsContainer.appendChild(SVG.Text(0, 10, this.getLabel('periods')));
			const x_margin = 8;
			const y_margin = 5;
			let offset = 80;
			this.config.periods.forEach(period => {
				const group = SVG.Group();
				that.periodsContainer.appendChild(group);
				//create label
				const label = SVG.Text(offset, 10, period.label);
				group.appendChild(label);
				//create background
				const box = label.getBBox();
				const background = SVG.Rectangle(box.x - x_margin, box.y - y_margin, box.width + 2 * x_margin, box.height + 2 * y_margin);
				group.appendChild(background);
				//make text go over
				group.appendChild(label);
				offset += (box.width + 2 * x_margin);
				//add listener
				group.addEventListener('click', () => this.setPeriod(period.timeframe));
			});
		}

		//selected period
		this.selectedPeriodContainer = SVG.Text(that.config.legendWidth + MARGIN + this.graphsWidth, this.config.height - this.config.scrollerHeight - MARGIN - SCROLLER_PERIODS_HEIGHT + 10, '', {'text-anchor': 'end'});
		this.svg.appendChild(this.selectedPeriodContainer);

		//scroller
		let handles_container;
		let scroller_handle_x;

		//handle listeners
		function start_move_scale_scroller(event) {
			event.stopPropagation();
			document.addEventListener('mouseup', stop_move_scale_scroller, {once: true, passive: true});
			document.addEventListener('touchend', stop_move_scale_scroller, {once: true, passive: true});
			handles_container.style.cursor = 'e-resize';
			that.scrollerSelector.style.cursor = 'e-resize';
		}

		function start_move_scale_scroller_left(event) {
			start_move_scale_scroller(event);
			document.addEventListener('mousemove', move_scale_scroller_left);
			document.addEventListener('touchmove', move_scale_scroller_left);
		}

		function start_move_scale_scroller_right(event) {
			start_move_scale_scroller(event);
			document.addEventListener('mousemove', move_scale_scroller_right);
			document.addEventListener('touchmove', move_scale_scroller_right);
		}

		function move_scale_scroller_left(event) {
			event.stopPropagation();
			let [coordinate_x] = that.getMousePosition(event);
			coordinate_x -= (that.config.legendWidth + MARGIN);
			//retrieve upper limit using position of right handle
			const upper_x = parseInt(/(-?\d+)/.exec(that.scrollerRightHandle.getAttribute('transform'))[0]) + 3;
			//event lower and upper limits
			coordinate_x = Math.max(coordinate_x, 0);
			coordinate_x = Math.min(coordinate_x, upper_x);
			//adjust scroller and move handle
			that.scrollerSelector.setAttributeNS(null, 'width', (upper_x - coordinate_x).toString());
			that.scrollerSelector.setAttributeNS(null, 'x', coordinate_x.toString());
			that.scrollerLeftHandle.setAttribute('transform', `translate(${coordinate_x - 3})`);
		}

		function move_scale_scroller_right(event) {
			event.stopPropagation();
			let [coordinate_x] = that.getMousePosition(event);
			coordinate_x -= (that.config.legendWidth + MARGIN);
			//retrieve lower limit using position of left handle
			const lower_x = parseInt(/(-?\d+)/.exec(that.scrollerLeftHandle.getAttribute('transform'))[0]) + 3;
			//event lower and upper limits
			coordinate_x = Math.max(coordinate_x, lower_x);
			coordinate_x = Math.min(coordinate_x, that.graphsWidth);
			//adjust scroller and move handle
			that.scrollerSelector.setAttributeNS(null, 'width', (coordinate_x - lower_x).toString());
			that.scrollerRightHandle.setAttribute('transform', `translate(${coordinate_x - 3})`);
		}

		function stop_move_scale_scroller(event) {
			event.stopPropagation();
			document.removeEventListener('mousemove', move_scale_scroller_right);
			document.removeEventListener('touchmove', move_scale_scroller_right);
			document.removeEventListener('mousemove', move_scale_scroller_left);
			document.removeEventListener('touchmove', move_scale_scroller_left);
			that.scrollerSelector.style.cursor = '';
			handles_container.style.cursor = '';
			//calculate start and stop dates
			const start_date = that.state.data.timeframe.startDate.clone();
			start_date.addMilliseconds(Math.round(parseInt(that.scrollerSelector.getAttributeNS(null, 'x')) / that.state.data.scale));
			const stop_date = start_date.clone();
			stop_date.addMilliseconds(Math.round(parseInt(that.scrollerSelector.getAttributeNS(null, 'width')) / that.state.data.scale));
			//set date
			that.setPeriod(new Timeframe(start_date, stop_date));
		}

		//scroller listeners
		function start_move_scroller(event) {
			event.stopPropagation();
			scroller_handle_x = event.touches ? event.touches[0].pageX - that.config.legendWidth : event.clientX;
			scroller_handle_x -= parseInt(that.scrollerSelector.getAttributeNS(null, 'x'), 10);
			document.addEventListener('mouseup', stop_move_scroller, {once: true, passive: true});
			document.addEventListener('touchend', stop_move_scroller, {once: true, passive: true});
			document.addEventListener('mousemove', move_scroller, {passive: true});
			document.addEventListener('touchmove', move_scroller, {passive: true});
			that.scrollerSelector.setAttributeNS(null, 'class', 'scroller scrolling');
		}

		function move_scroller(event) {
			event.stopPropagation();
			let event_x = event.touches ? event.touches[0].pageX - that.config.legendWidth : event.clientX;
			const current_width = parseInt(that.scrollerSelector.getAttributeNS(null, 'width'), 10);
			//event lower and upper limits
			event_x = Math.max(event_x, scroller_handle_x);
			event_x = Math.min(event_x, scroller_handle_x + that.graphsWidth - current_width);
			//update graph period
			const start_date = that.state.data.timeframe.startDate.clone().addMilliseconds((event_x - scroller_handle_x) / that.state.data.scale);
			that.setPeriod(that.state.visible.timeframe.clone().shiftStartDate(start_date));
		}

		function stop_move_scroller(event) {
			event.stopPropagation();
			that.scrollerSelector.setAttributeNS(null, 'class', 'scroller');
			document.removeEventListener('mousemove', move_scroller);
			document.removeEventListener('touchmove', move_scroller);
		}

		if(this.config.showScroller) {
			const scroller = SVG.Group({id: this.generateId('scroller'), transform: `translate(${that.config.legendWidth + MARGIN},${this.config.height - this.config.scrollerHeight - MARGIN})`});
			this.svg.appendChild(scroller);

			//grading container
			const grading_container = SVG.Group({'clip-path': `url(#${this.generateId('scroller_grading_container_clip')})`});
			scroller.appendChild(grading_container);

			//grading frame
			grading_container.appendChild(SVG.Rectangle(0, 0, this.graphsWidth, this.config.scrollerHeight, {class: 'scroller_frame'}));

			//draw scroller representation
			grading_container.appendChild(SVG.Rectangle(0, 0, this.graphsWidth, this.config.scrollerHeight, {'clip-path': `url(#${this.generateId('scroller_clip')})`, style: 'fill: white;'}));

			//scroller representation clip
			const scroller_clip = SVG.Element('clipPath', {id: this.generateId('scroller_clip')});
			const scroller_clip_use = SVG.Element('use');
			scroller_clip_use.setAttribute('href', `#${this.generateId('scroller_selector')}`);
			scroller_clip.appendChild(scroller_clip_use);
			grading_container.appendChild(scroller_clip);

			//calculate the number of labels that will be displayed
			const slots = Math.round(this.graphsWidth / 150);
			const intervals = get_unit_intervals(this.state.data.timeframe, slots);
			const y_position = Math.round(this.config.scrollerHeight / 2) + 6;

			for(let i = TimeUnits.length - 1; i >= 0; i--) {
				const unit = TimeUnits[i];
				const interest = intervals[unit.name];
				if(interest) {
					const date = unit.previous_interesting(this.state.data.timeframe.startDate, interest);
					let previous_position;
					//loop until stop date plus one iteration to draw the latest label
					while(date < this.state.data.timeframe.stopDate.clone().addDuration(unit, interest)) {
						const position = this.getScrollerPosition(date);
						grading_container.appendChild(SVG.Line(position, 0, position, this.config.scrollerHeight, {class: 'grading'}));
						if(previous_position) {
							const text_position = previous_position + (position - previous_position) / 2;
							const previous_date = date.clone().addDuration(unit, -interest);
							let label = previous_date.getFullUnitValueLabel(unit, this.locale);
							if(interest > 1) {
								label = `${label} - ${date.getFullUnitValueLabel(unit, this.locale)}`;
							}
							grading_container.appendChild(SVG.Text(text_position, y_position, label, {class: 'scroller_grading_label', 'text-anchor': 'middle'}));
						}
						previous_position = position;
						date.addDuration(unit, interest);
					}
					//only display the first interesting unit
					break;
				}
			}

			//handles container
			handles_container = SVG.Group({style: 'position: relative;'});
			scroller.appendChild(handles_container);

			//scroller handles
			//fill handles container with an invisible rectangle so specific cursors can be displayed
			handles_container.appendChild(SVG.Rectangle(0, 0, this.graphsWidth, this.config.scrollerHeight, {style: 'opacity: 0;'}));

			//scroller selector
			this.scrollerSelector = SVG.Rectangle(0, 0, 0, this.config.scrollerHeight, {id: this.generateId('scroller_selector'), class: 'scroller'});
			this.scrollerSelector.addEventListener('mousedown', start_move_scroller, {passive: true});
			this.scrollerSelector.addEventListener('touchstart', start_move_scroller, {passive: true});
			handles_container.appendChild(this.scrollerSelector);

			//scroller left handle
			this.scrollerLeftHandle = SVG.Group({transform: 'translate(-3)'});
			const scroller_left_handle_use = SVG.Element('use');
			scroller_left_handle_use.setAttribute('href', `#${this.generateId('scroller_handle')}`);
			this.scrollerLeftHandle.appendChild(scroller_left_handle_use);

			this.scrollerLeftHandle.addEventListener('mousedown', start_move_scale_scroller_left, {passive: true});
			this.scrollerLeftHandle.addEventListener('touchstart', start_move_scale_scroller_left, {passive: true});
			handles_container.appendChild(this.scrollerLeftHandle);

			//scroller right handle
			this.scrollerRightHandle = SVG.Group({transform: 'translate(-3)'});
			const scroller_right_handle_use = SVG.Element('use');
			scroller_right_handle_use.setAttribute('href', `#${this.generateId('scroller_handle')}`);
			this.scrollerRightHandle.appendChild(scroller_right_handle_use);

			this.scrollerRightHandle.addEventListener('mousedown', start_move_scale_scroller_right, {passive: true});
			this.scrollerRightHandle.addEventListener('touchstart', start_move_scale_scroller_right, {passive: true});
			handles_container.appendChild(this.scrollerRightHandle);
		}

		//tooltip
		this.tooltip = SVG.Group({id: this.generateId('tooltip'), class: 'tooltip'});
		this.tooltip.appendChild(SVG.Rectangle(0, 0, 60, 20, {rx: '3', ry: '3'}));
		this.tooltip.appendChild(SVG.Text(5, 15, '', {lengthAdjust: 'spacing'}));
		this.tooltip.appendChild(SVG.Group({transform: 'translate(5,15)'}));
		this.svg.appendChild(this.tooltip);

		//generic tooltip
		function hook_tooltip(legend) {
			//do not display legend tooltips on touch devices
			const touch = window.matchMedia('(pointer:coarse)');
			if(!touch.matches) {
				legend.addEventListener('mousemove', show_tooltip);
				legend.addEventListener('mouseout', () => that.hideTooltip());
			}
		}

		function show_tooltip(event) {
			//update tooltip container content
			that.tooltip.lastChild.empty();
			that.tooltip.lastChild.appendChild(SVG.Text(0, 0, this.getAttribute('data-tooltip-text')));
			that.tooltip.firstElementChild.setAttributeNS(null, 'stroke', this.getAttribute('data-tooltip-color'));

			that.updateTooltip(event);
		}

		const period = this.config.periods.find(p => p.default) || this.config.periods[0];
		this.setPeriod(period.timeframe);
	}

	constrainPeriodToData(p) {
		//do not touch parameter (date and timeframe are mutable)
		const period = p.clone();
		//period cannot start before the data timeframe
		if(period.isBefore(this.state.data.timeframe)) {
			period.shiftStartDate(this.state.data.timeframe.startDate);
		}
		//period cannot end before the data timeframe
		if(period.isAfter(this.state.data.timeframe)) {
			period.shiftStopDate(this.state.data.timeframe.stopDate);
		}
		//if period is still out of data timeframe, shrink it
		if(period.isBefore(this.state.data.timeframe)) {
			period.startDate = this.state.data.timeframe.startDate.clone();
		}
		//period must not be smaller than a percentage of the total data timeframe
		const minimum_milliseconds = Math.round(this.state.data.timeframe.getMilliseconds() / 100);
		const missing_milliseconds = minimum_milliseconds - period.getMilliseconds();
		if(missing_milliseconds > 0) {
			period.extendMilliseconds(missing_milliseconds);
		}
		return period;
	}

	setPeriod(p) {
		const period = this.constrainPeriodToData(p);

		//round period to the unit that makes sense
		let unit = TimeUnit.MILLISECONDS;
		if(period.getMilliseconds() > 10000) {
			unit = TimeUnit.SECONDS;
		}
		if(period.getDays() > 10) {
			unit = TimeUnit.DAYS;
		}

		//update period only if it has changed
		if(!period.equals(this.state.visible.timeframe)) {
			this.state.visible = {
				timeframe: period,
				scale: this.graphsWidth / period.getMilliseconds()
			};

			this.drawGraphs();

			const period_label = `${this.state.visible.timeframe.startDate.toUTCUnitDisplay(unit)} → ${this.state.visible.timeframe.stopDate.toUTCUnitDisplay(unit)}`;
			this.selectedPeriodContainer.textContent = period_label;
			try {
				//update scroller position
				if(this.config.showScroller) {
					const scroller_position = this.getScrollerPosition(this.state.visible.timeframe.startDate);
					const scroller_length = this.getScrollerWidth(this.state.visible.timeframe.getMilliseconds());
					//update background position
					this.scrollerSelector.setAttribute('x', scroller_position.toString());
					this.scrollerSelector.setAttribute('width', scroller_length.toString());
					//update handles positions
					this.scrollerLeftHandle.setAttribute('transform', `translate(${scroller_position - 3})`);
					this.scrollerRightHandle.setAttribute('transform', `translate(${scroller_position + scroller_length - 3})`);
				}
				//select good period in period selector
				if(this.config.periods.length > 1) {
					const period_index = this.config.periods.findIndex(p => p.timeframe.equals(period));
					this.periodsContainer.querySelectorAll('g').forEach((group, index) => {
						group.removeAttribute('class');
						if(period_index === index) {
							group.setAttribute('class', 'selected');
						}
					});
				}
			}
			catch(exception) {
				console.log(exception);
				this.errorFrame.style.display = 'block';
			}
		}
	}

	getScrollerPosition(date) {
		const translation = Date.getDifferenceInMilliseconds(this.state.data.timeframe.startDate, date);
		return translation * this.state.data.scale;
	}

	getScrollerWidth(duration) {
		return this.state.data.scale * duration;
	}

	getGraphPosition(date) {
		const translation = Date.getDifferenceInMilliseconds(this.state.visible.timeframe.startDate, date);
		return translation * this.state.visible.scale;
	}

	getGraphWidth(duration) {
		return this.state.visible.scale * duration;
	}

	drawXaxis() {
		this.xaxisSubcontainer.empty();

		//calculate the number of labels that will be displayed
		const slots = Math.round(this.graphsWidth / 40);
		const intervals = get_unit_intervals(this.state.visible.timeframe, slots);

		//draw x-axis
		let unit_index = 0;
		//x-axis displays only the two most relevant units
		for(let i = TimeUnits.length - 1; i >= 0; i--) {
			//only display the first two interesting units
			if(unit_index > 1) {
				break;
			}
			const unit = TimeUnits[i];
			const interest = intervals[unit.name];
			if(interest) {
				const date = unit.previous_interesting(this.state.visible.timeframe.startDate, interest);
				while(date < this.state.visible.timeframe.stopDate) {
					const position = this.getGraphPosition(date);
					this.xaxisSubcontainer.appendChild(SVG.Line(position, 0, position, 5 * (1 + unit_index), {class: 'grading'}));
					//date label depends on the unit index
					//display only the simple label for the first level unit
					//display full label for the second level unit
					const date_label = unit_index === 0 ? date.getUnitValueLabel(unit, this.locale) : date.getFullUnitValueLabel(unit, this.locale);
					this.xaxisSubcontainer.appendChild(SVG.Text(position, 15 * (1 + unit_index), date_label, {class: 'grading_label', 'text-anchor': 'middle'}));
					date.addDuration(unit, interest);
				}
				unit_index++;
			}
		}
	}

	drawYaxis() {
		this.yaxisContainer.empty();

		//draw y-axis for dot, line and bar graphs
		this.sections
			.filter(s => s.scale && !s.hidden && !s.values.isEmpty())
			.forEach(section => {
				const section_offset = section.getOffset();
				const section_height = section.getHeight();
				const value_in_pixel = section_height / (section.scale.max - section.scale.min);
				const axis_group = SVG.Group({id: this.generateId(`axis_${section.id}`)});
				this.yaxisContainer.appendChild(axis_group);

				//find x position for scale
				const scale_x_start = section.scale.position === 'LEFT' ? -5 : this.graphsWidth;
				const scale_x_position = (section.scale.rank - 1) * GRADUATION_PADDING * (section.scale.position === 'LEFT' ? -1 : 1) + scale_x_start;

				//draw unit if any
				if(section.unit) {
					axis_group.appendChild(SVG.Text(scale_x_position + 2, section_offset -10, section.unit, {class: 'grading_label', style: `fill: ${section.color}`}));
				}

				//for ranks greater than one, redraw a vertical line
				if(section.scale.rank > 1) {
					axis_group.appendChild(SVG.Line(scale_x_position, section_offset, scale_x_position, section_offset + section_height, {class: 'grading', style: `stroke: ${section.color}`}));
				}

				//draw marks and labels
				//take care because the scale may involve floats
				//in order to avoid dealing with floats, transform values into integers using the precision specified in the configuration
				const factor = Math.pow(10, section.scale.decimal || 1);
				const mark_amplified = Math.round(section.scale.markInterval * factor);
				const label_amplified = Math.round(section.scale.labelInterval * factor);
				const min_amplified = Math.round(section.scale.min * factor);
				const max_amplified = Math.round(section.scale.max * factor);
				for(let i = min_amplified; i <= max_amplified; i = i + mark_amplified) {
					const value = i / factor;
					const value_offset = value - section.scale.min;
					const position = section_offset + section_height - value_in_pixel * value_offset;
					axis_group.appendChild(SVG.Line(scale_x_position, position, scale_x_position + 5, position, {class: 'grading', style: `stroke: ${section.color}`}));
					//display a label for important marks
					if((i - min_amplified) % label_amplified === 0) {
						//create label text
						let grading_text = value.toString();
						//use "M" and "k" to shorten label
						grading_text = grading_text.replace(/0{6}$/, 'M');
						grading_text = grading_text.replace(/0{3}$/, 'k');
						const grading_label = SVG.Text(0, position + 3, grading_text, {class: 'grading_label', style: `fill: ${section.color}`});
						axis_group.appendChild(grading_label);
						//offset label by its length in order to simulate a right align property
						const x_position = section.scale.position === 'RIGHT' ? scale_x_position + 10 : - grading_label.getBBox().width - 10;
						grading_label.setAttribute('x', x_position.toString());
						//do not create a line for 0 if this section is at the bottom of the graph in order not to overwrite graph frame
						if(section.position.start > 0 || value_offset > 0) {
							axis_group.appendChild(SVG.Line(0, position, this.graphsWidth, position, {class: 'grid'}));
						}
					}
				}
			});
	}

	drawGraphs() {
		const that = this;

		function show_tooltip(event) {
			const section_id = this.getAttributeNS(null, 'data-section-id');
			const reference_index = this.getAttributeNS(null, 'data-reference-index');
			const value_index = this.getAttributeNS(null, 'data-value-index');

			const tooltip_section_id = that.tooltip.getAttributeNS(null, 'data-section-id');
			const tooltip_reference_index = that.tooltip.getAttributeNS(null, 'data-section-id');
			const tooltip_value_index = that.tooltip.getAttributeNS(null, 'data-value-index');

			//check if last displayed tooltip is the same
			//this occurs a lot because this method is called on mouse move
			//we don't want to redraw the tooltip that has already been drawn
			if(tooltip_section_id !== section_id || tooltip_reference_index !== reference_index || tooltip_value_index !== value_index) {
				//retrieve parameters
				const section = that.getSection(section_id);
				const reference = reference_index !== undefined ? section.references[reference_index] : undefined;
				const value = reference ? reference.entries[value_index] : section.values[value_index];
				//retrieve tooltip text
				const tooltip_text = reference ? reference.getLocalizedTooltip() : section.getLocalizedTooltip();
				//build template replacement object
				const template_vars = {
					entry: value,
					section: section
				};
				//build tooltip group
				const tooltip = SVG.Group();
				//add lines of text in tooltip
				let offset = 0;
				tooltip_text.split('\n').forEach((text, index) => {
					//interpret conditions in tooltip text
					//use text as a template literal
					const interpreted_text = text.interpolate(template_vars);
					//create line in tooltip
					const line = SVG.Text(0, offset, interpreted_text);
					if(index === 0) {
						line.setAttribute('class', 'title');
					}
					tooltip.appendChild(line);
					offset += 18;
				});
				//update tooltip container content
				that.tooltip.lastChild.empty();
				that.tooltip.childNodes[1].textContent = '';
				that.tooltip.lastChild.appendChild(tooltip);
				that.tooltip.firstElementChild.setAttributeNS(null, 'stroke', this.getAttributeNS(null, 'data-color'));
				//retain parameters
				that.tooltip.setAttributeNS(null, 'data-section-id', section_id);
				that.tooltip.setAttributeNS(null, 'data-reference-index', reference_index === undefined ? '' : reference_index);
				that.tooltip.setAttributeNS(null, 'data-value-index', value_index);
			}
			that.updateTooltip(event);
		}

		function hook_tooltip(element, section, reference_index, value_index, color) {
			//hook only if there is a tooltip to hook
			const tooltip_text = reference_index ? section.references[reference_index].getLocalizedTooltip() : section.getLocalizedTooltip();
			if(tooltip_text) {
				//attach tooltip to element
				element.setAttributeNS(null, 'data-section-id', section.id);
				element.setAttributeNS(null, 'data-reference-index', reference_index === undefined ? '' : reference_index);
				element.setAttributeNS(null, 'data-value-index', value_index);
				element.setAttributeNS(null, 'data-color', color);
				element.addEventListener('mousemove', show_tooltip);
				element.addEventListener('mouseout', () => that.hideTooltip());
			}
		}

		//empty graphs and axis
		this.graphsSubcontainer.empty();

		this.drawXaxis();
		this.drawYaxis();

		//draw values
		this.sections
			.filter(s => !s.hidden && !s.values.isEmpty())
			.forEach(section => {
				//offset
				const section_offset = section.getOffset();
				const section_height = section.getHeight();
				//values
				const graph_group = SVG.Group({id: this.generateId(`graph_${section.id}`)});
				this.graphsSubcontainer.appendChild(graph_group);
				switch(section.type) {
					//action
					case GraphType.ACTION:
						section.values.forEach((value, value_index) => {
							if(this.state.visible.timeframe.surrounds(value.date)) {
								const position = this.getGraphPosition(value.date);
								//container
								const container = SVG.Group({class: 'outline'});
								hook_tooltip(container, section, undefined, value_index, section.color);
								graph_group.appendChild(container);
								//area
								const area = SVG.Rectangle(position - 3, 0, 6, this.graphsHeight, {class: 'area'});
								//action
								let style = `stroke: ${section.color};`;
								if(section.dashed) {
									style += 'stroke-dasharray: 2, 2;';
								}
								const action = SVG.Line(position, 0, position, this.graphsHeight, {class: 'value_action', style: style});
								//link
								if(value.link) {
									const link = SVG.Link(value.link);
									link.appendChild(action);
									link.appendChild(area);
									container.appendChild(link);
								}
								else {
									container.appendChild(action);
									container.appendChild(area);
								}
							}
						});
						break;
					//date
					case GraphType.DATE:
						section.values.forEach((value, value_index) => {
							if(this.state.visible.timeframe.surrounds(value.date)) {
								const position = this.getGraphPosition(value.date);
								//container
								const container = SVG.Group({class: 'outline'});
								hook_tooltip(container, section, undefined, value_index, section.color);
								graph_group.appendChild(container);
								//dot
								let dot;
								const style = `stroke: ${section.color}; fill:${section.color};`;
								if(value.icon) {
									dot = SVG.Image(position, section_offset, 20, 20, value.icon);
								}
								else {
									dot = section.symbol.create(position, section_offset + 8, 1, {style: style});
								}
								//link
								if(value.link) {
									const link = SVG.Link(value.link);
									link.appendChild(dot);
									container.appendChild(link);
								}
								else {
									container.appendChild(dot);
								}
							}
						});
						break;
					//period
					case GraphType.PERIOD: {
						const levels = [];
						section.values.forEach((value, value_index) => {
							if(this.state.visible.timeframe.overlaps(value.timeframe)) {
								let p = 0;
								//check if it overlaps with an already drawn period
								let placed = false;
								while(!placed) {
									if(!levels[p]) {
										levels[p] = [value];
										placed = true;
									}
									else {
										let overlap;
										for(let q = 0; q < levels[p].length; q++) {
											overlap = false;
											if(value.timeframe.overlaps(levels[p][q].timeframe)) {
												overlap = true;
											}
										}
										if(!overlap) {
											levels[p].push(value);
											placed = true;
										}
									}
									if(!placed) {
										p++;
									}
								}
								//find period length
								let length = this.getGraphWidth(value.timeframe.getMilliseconds());
								//set min length to 10
								if(length < 10) {
									length = 10;
								}
								const start_position = this.getGraphPosition(value.date);
								//labels
								const language = that.locale.substring(0, 2);
								const period_label = value.label || section.label[language];
								//create a group and translate if at the right place (add some margin on top to let room for the arrow)
								const period_group = SVG.Group({
									color: section.color,
									transform: `translate(0,${section_offset + 10 + 18 * p})`
								});
								//draw an arrow for ongoing period
								if(value.ongoing) {
									const path = `m5 0 h${length} v-8 l15 15.5 l-15 15.5 v-8 h-${length} q-5 0 -5 -5 v-5 q0 -5 5 -5z`;
									period_group.appendChild(SVG.Path(start_position, 0, path, {style: `fill: ${section.color}; cursor: pointer; opacity: 0.95;`}));
								}
								//draw a rectangle for period with end date
								else {
									period_group.appendChild(SVG.Rectangle(start_position, 0, length, 15, {
										rx: 5,
										style: `fill:${section.color}; cursor: pointer; opacity: 0.95;`}));
								}
								//tooltip
								hook_tooltip(period_group, section, undefined, value_index, section.color);
								//link
								if(value.link) {
									const link = SVG.Link(value.link);
									link.appendChild(period_group);
									graph_group.appendChild(link);
								}
								else {
									graph_group.appendChild(period_group);
								}
								//add label if period is there is enough room to display it
								const beginning_position = Math.max(start_position, 0);
								const visible_length = length - (beginning_position - start_position);
								if(visible_length > 20) {
									const period_text = SVG.Text(beginning_position + 3, 11, period_label, {fill: 'white', class: 'value_period'});
									period_group.appendChild(period_text);
									SVG.TextEllipsis(period_text, visible_length);
								}
							}
						});
						break;
					}
					//dot and lines
					case GraphType.LINE:
					case GraphType.DOT: {
						graph_group.classList.add('value_line');
						const value_in_pixel = section_height / (section.scale.max - section.scale.min);
						let x_position, y_position, previous_x_position, previous_y_position;
						//store reference points to be able to fill space between references
						const references_points = [];
						//draw references
						if(!section.referencesHidden) {
							section.references.filter(r => r.valid).forEach((reference, reference_index) => {
								const reference_delimit = reference_index === 0 || reference_index === section.references.length - 1;
								const reference_points = [];
								if(reference_delimit) {
									references_points.push(reference_points);
								}
								const reference_group = SVG.Group({class: 'outline'});
								graph_group.appendChild(reference_group);
								reference.entries.forEach((entry, index) => {
									previous_x_position = x_position;
									previous_y_position = y_position;
									x_position = this.getGraphPosition(entry.date);
									y_position = section_offset + section_height - value_in_pixel * (entry.value - section.scale.min);
									if(reference_delimit) {
										reference_points.push([x_position, y_position]);
									}
									const style = `stroke: ${reference.color}; fill: ${reference.color};`;
									//line
									if(GraphType.LINE === section.type && index > 0) {
										let line_style = style;
										if(reference.dashed) {
											line_style += ' stroke-dasharray: 2, 2;';
										}
										reference_group.insertBefore(SVG.Line(previous_x_position, previous_y_position, x_position, y_position, {style: line_style}), reference_group.firstChild);
									}
									//dot
									reference_group.appendChild(section.symbol.create(x_position, y_position, 0.3, {style: style}));
									//area for tooltip
									if(!Object.isEmpty(reference.tooltip)) {
										const area = section.symbol.create(x_position, y_position, 1.2, {class: 'area'});
										hook_tooltip(area, section, reference_index, index, reference.color);
										reference_group.appendChild(area);
									}
								});
							});
							//fill space between references
							if(section.references.filter(r => r.valid).length > 1) {
								const path_points = [].concat(references_points[0], references_points[1].reverse());
								const path = path_points.map((p, i) => (i > 0 ? 'L' : 'M') + p.join(' ')).join(' ');
								graph_group.insertBefore(SVG.Element('path', {d: path, style: `fill: url(#${this.generateId(`gradient_${section.id}`)}); opacity: 0.3`}), graph_group.firstChild);
							}
						}
						//values
						const value_group = SVG.Group({class: 'outline'});
						graph_group.appendChild(value_group);
						section.values.forEach((value, value_index) => {
							previous_x_position = x_position;
							previous_y_position = y_position;
							x_position = this.getGraphPosition(value.date);
							y_position = section_offset + section_height - value_in_pixel * (value.value - section.scale.min);
							const style = `stroke: ${section.color}; fill: ${section.color};`;
							//line
							if(GraphType.LINE === section.type && value_index > 0) {
								let line_style = style;
								if(section.dashed) {
									line_style += 'stroke-dasharray: 2, 2;';
								}
								value_group.insertBefore(SVG.Line(previous_x_position, previous_y_position, x_position, y_position, {style: line_style}), value_group.firstChild);
							}
							//dot
							value_group.appendChild(section.symbol.create(x_position, y_position, 0.8, {style: style}));
							//anchor
							const area = section.symbol.create(x_position, y_position, 1.2, {class: 'area'});
							hook_tooltip(area, section, undefined, value_index, section.color);
							//link
							if(value.link) {
								const link = SVG.Link(value.link);
								link.appendChild(area);
								value_group.appendChild(link);
							}
							else {
								value_group.appendChild(area);
							}
						});
						break;
					}
					//bar
					case GraphType.BAR: {
						const value_in_pixel = section_height / (section.scale.max - section.scale.min);
						section.values.forEach((value, value_index) => {
							if(this.state.visible.timeframe.surrounds(value.date)) {
								const x_position = this.getGraphPosition(value.date);
								const length = this.getGraphWidth(value.timeframe.getMilliseconds());
								const height = value_in_pixel * value.value;
								const y_position = section_offset + section_height - height;
								const rectangle = SVG.Rectangle(x_position, y_position, length, height, {
									style: `stroke: ${section.strokeColor}; fill:${section.color}; opacity: ${section.opacity};`,
									color: section.color
								});
								//tooltip
								hook_tooltip(rectangle, section, undefined, value_index);
								graph_group.appendChild(rectangle);
							}
						});
						break;
					}
				}
			});
	}
	getLabel(string) {
		return GetLabel(string, this.locale);
	}
}
