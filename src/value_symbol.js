import {SVG} from '@matco/basic-tools/svg.js';

export const ValueSymbol = {
	CIRCLE: {
		id: 'CIRCLE',
		create: function(x, y, size, properties) {
			return SVG.Circle(x, y, 4 * size, properties);
		}
	},
	SQUARE: {
		id: 'SQUARE',
		create: function(x, y, size, properties) {
			return SVG.Rectangle(x - 4 * size, y - 4 * size, 8 * size, 8 * size, properties);
		}
	},
	CROSS: {
		id: 'CROSS',
		path: 'h3 v3 h3 v3 h-3 v3 h-3 v-3 h-3 v-3 h3 Z',
		create: function(x, y, size, properties) {
			const dimension = size * 3;
			return SVG.Path(x - 1.5 * size, y - 4.5 * size, `h${dimension} v${dimension} h${dimension} v${dimension} h-${dimension} v${dimension} h-${dimension} v-${dimension} h-${dimension} v-${dimension} h${dimension} Z`, properties);
		}
	},
	TRIANGLE: {
		id: 'TRIANGLE',
		path: 'l6 6 l-6 6 Z',
		create: function(x, y, size, properties) {
			const dimension = size * 6;
			return SVG.Path(x - 3 * size, y - 6 * size, `l${dimension} ${dimension} l-${dimension} ${dimension} Z`, properties);
		}
	},
	DIAMOND: {
		id: 'DIAMOND',
		path: 'l6 6 l-6 6 l-6 -6 Z',
		create: function(x, y, size, properties) {
			const dimension = size * 6;
			return SVG.Path(x, y - 6 * size, `l${dimension} ${dimension} l-${dimension} ${dimension}l-${dimension} -${dimension} Z`, properties);
		}
	}
};
