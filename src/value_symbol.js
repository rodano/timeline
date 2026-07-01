import {SVG} from '@matco/basic-tools/svg.js';

/**
 * Catalog of shapes usable to render a value point on the timeline. Each entry
 * exposes an id and a create factory returning an SVG element.
 */
export const ValueSymbol = {
	CIRCLE: {
		id: 'CIRCLE',

		/**
		 * Create a circle symbol.
		 * @param {number} x - Horizontal center of the symbol.
		 * @param {number} y - Vertical center of the symbol.
		 * @param {number} size - Scale factor applied to the base radius.
		 * @param {object} properties - Extra attributes forwarded to the SVG element.
		 * @returns {SVGElement} The created SVG circle element.
		 */
		create: function(x, y, size, properties) {
			return SVG.Circle(x, y, 4 * size, properties);
		}
	},
	SQUARE: {
		id: 'SQUARE',

		/**
		 * Create a square symbol centered on the given coordinates.
		 * @param {number} x - Horizontal center of the symbol.
		 * @param {number} y - Vertical center of the symbol.
		 * @param {number} size - Scale factor applied to the base side length.
		 * @param {object} properties - Extra attributes forwarded to the SVG element.
		 * @returns {SVGElement} The created SVG rectangle element.
		 */
		create: function(x, y, size, properties) {
			return SVG.Rectangle(x - 4 * size, y - 4 * size, 8 * size, 8 * size, properties);
		}
	},
	CROSS: {
		id: 'CROSS',
		path: 'h3 v3 h3 v3 h-3 v3 h-3 v-3 h-3 v-3 h3 Z',

		/**
		 * Create a cross symbol centered on the given coordinates.
		 * @param {number} x - Horizontal center of the symbol.
		 * @param {number} y - Vertical center of the symbol.
		 * @param {number} size - Scale factor applied to the base dimensions.
		 * @param {object} properties - Extra attributes forwarded to the SVG element.
		 * @returns {SVGElement} The created SVG path element.
		 */
		create: function(x, y, size, properties) {
			const dimension = size * 3;
			return SVG.Path(x - 1.5 * size, y - 4.5 * size, `h${dimension} v${dimension} h${dimension} v${dimension} h-${dimension} v${dimension} h-${dimension} v-${dimension} h-${dimension} v-${dimension} h${dimension} Z`, properties);
		}
	},
	TRIANGLE: {
		id: 'TRIANGLE',
		path: 'l6 6 l-6 6 Z',

		/**
		 * Create a triangle symbol centered on the given coordinates.
		 * @param {number} x - Horizontal center of the symbol.
		 * @param {number} y - Vertical center of the symbol.
		 * @param {number} size - Scale factor applied to the base dimensions.
		 * @param {object} properties - Extra attributes forwarded to the SVG element.
		 * @returns {SVGElement} The created SVG path element.
		 */
		create: function(x, y, size, properties) {
			const dimension = size * 6;
			return SVG.Path(x - 3 * size, y - 6 * size, `l${dimension} ${dimension} l-${dimension} ${dimension} Z`, properties);
		}
	},
	DIAMOND: {
		id: 'DIAMOND',
		path: 'l6 6 l-6 6 l-6 -6 Z',

		/**
		 * Create a diamond symbol centered on the given coordinates.
		 * @param {number} x - Horizontal center of the symbol.
		 * @param {number} y - Vertical center of the symbol.
		 * @param {number} size - Scale factor applied to the base dimensions.
		 * @param {object} properties - Extra attributes forwarded to the SVG element.
		 * @returns {SVGElement} The created SVG path element.
		 */
		create: function(x, y, size, properties) {
			const dimension = size * 6;
			return SVG.Path(x, y - 6 * size, `l${dimension} ${dimension} l-${dimension} ${dimension}l-${dimension} -${dimension} Z`, properties);
		}
	}
};
