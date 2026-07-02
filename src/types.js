/**
 * @module types
 * @description Shared JSDoc typedefs used across the timeline codebase.
 * Declared in a `.js` file (rather than an ambient `.d.ts`) so that both
 * TypeScript (via `checkJs`) and `eslint-plugin-jsdoc` can resolve them.
 * Reference them from other files with the JSDoc `import()` syntax,
 * e.g. `@param {import("./types.js").TimelineConfig} config`.
 */

/**
 * A localized label, keyed by two-letter language code (`en`, `fr`, ...).
 * @typedef {{[language: string]: string}} LocalizedLabel
 */

/**
 * Position where a section's y-axis scale should be drawn.
 * @typedef {"LEFT" | "RIGHT"} ScalePosition
 */

/**
 * Configuration for a section's y-axis scale.
 * @typedef {object} ScaleConfig
 * @property {ScalePosition} position - Which side of the graph the scale is displayed on.
 * @property {number} min - Minimum value of the scale.
 * @property {number} max - Maximum value of the scale.
 * @property {number} decimal - Precision (number of decimal digits) used for the scale.
 * @property {number} markInterval - Distance between marks on the scale.
 * @property {number} labelInterval - Distance between labels on the scale (must be a multiple of markInterval).
 * @property {number} [rank] - Filled in at runtime by the Timeline when the section is initialized.
 */

/**
 * Vertical position (as percentage of the graphs area) of a section.
 * @typedef {object} PositionConfig
 * @property {number} [start] - Start of the section, in percent (0 = bottom, 100 = top).
 * @property {number} [stop] - End of the section, in percent. Defaults to `start` when only one is given.
 */

/**
 * A single data point within a section.
 * @typedef {object} ValueConfig
 * @property {string} date_string - ISO date string for the point.
 * @property {string} [end_date_string] - ISO date string for the end of the period (BAR and PERIOD sections).
 * @property {number} [value] - Numeric value (LINE, DOT, BAR sections).
 * @property {string} [label] - Free-form label (PERIOD sections).
 * @property {string} [link] - Optional URL to open when the value is clicked (ACTION sections).
 * @property {string} [icon] - Optional icon URL to draw for the value (DATE sections).
 * @property {boolean} [ongoing] - Whether a PERIOD entry is still ongoing.
 * @property {Date} [date] - Parsed at runtime from `date_string`.
 * @property {Date} [end_date] - Parsed at runtime from `end_date_string`.
 * @property {object} [timeframe] - Built at runtime from `date` and `end_date`.
 * @property {object} [metadata] - Optional metadata associated with the value.
 */

/**
 * A relative time offset used by a reference entry.
 * @typedef {object} ReferenceEntryConfig
 * @property {LocalizedLabel} [label] - Label displayed alongside the reference entry.
 * @property {string} timepoint - Time-string offset relative to the referenced section's first value.
 * @property {Date} [date] - Filled in at runtime once the referenced section's first value is known.
 */

/**
 * A curve or set of entries anchored to another section's first value.
 * @typedef {object} ReferenceConfig
 * @property {LocalizedLabel} label - Localized display label.
 * @property {LocalizedLabel} [tooltip] - Optional localized tooltip text.
 * @property {ReferenceEntryConfig[]} entries - Entries composing the reference.
 * @property {string} referenceSectionId - Id of the section this reference is anchored to.
 * @property {string} [color] - Optional CSS color for the reference curve.
 */

/**
 * Type of graph rendered for a section.
 * @typedef {"LINE" | "DOT" | "BAR" | "DATE" | "PERIOD" | "ACTION"} SectionType
 */

/**
 * Identifier of the shape used to render a value point.
 * @typedef {"CIRCLE" | "SQUARE" | "CROSS" | "TRIANGLE" | "DIAMOND"} ValueSymbolId
 */

/**
 * Raw configuration for one section of the timeline.
 * @typedef {object} SectionConfig
 * @property {string} id - Unique identifier of the section.
 * @property {SectionType} type - Kind of graph rendered by the section.
 * @property {LocalizedLabel} label - Localized display label.
 * @property {PositionConfig} position - Vertical position of the section.
 * @property {string} [color] - CSS fill color used for the section content.
 * @property {string} [strokeColor] - CSS stroke color used for the section content.
 * @property {number} [opacity] - Section opacity between 0 and 1.
 * @property {boolean} [dashed] - Whether the section content should be dashed.
 * @property {boolean} [hidden] - Whether the section is initially hidden.
 * @property {boolean} [hiddenLegend] - Whether the section's legend is hidden.
 * @property {LocalizedLabel} [tooltip] - Optional localized tooltip text.
 * @property {ValueSymbolId} [mark] - Symbol used to render each value point.
 * @property {ScaleConfig} [scale] - Optional y-axis scale configuration.
 * @property {string} [unit] - Optional unit label displayed on the y-axis (e.g. "kg", "%").
 * @property {ValueConfig[]} [values] - Data points belonging to the section.
 * @property {ReferenceConfig[]} [references] - References attached to the section.
 */

/**
 * A named period that can be selected from the period selector.
 * @typedef {object} PeriodConfig
 * @property {string} label - Localized display label.
 * @property {string} [start_date_string] - ISO date string for the start of the period.
 * @property {string} [stop_date_string] - ISO date string for the end of the period.
 * @property {boolean} [default] - Marks the default period on initial render.
 * @property {object} [timeframe] - Built at runtime from the two date strings.
 */

/**
 * Root configuration object passed to the Timeline constructor.
 * @typedef {object} TimelineConfig
 * @property {string} [id] - Optional identifier for the timeline.
 * @property {number} [width] - Total width of the graph in pixels. If omitted, the container width is used.
 * @property {number} height - Total height of the graph in pixels.
 * @property {number} legendWidth - Width in pixels reserved on the left for the legend.
 * @property {number} scrollerHeight - Height in pixels reserved at the bottom for the scroller.
 * @property {boolean} showScroller - Whether the scroller (bottom overview strip) is displayed.
 * @property {string} [scopeModelId] - Optional identifier of the scope model this timeline represents.
 * @property {SectionConfig[]} sections - List of sections rendered by the timeline.
 * @property {PeriodConfig[]} periods - List of named periods offered in the period selector.
 */

//nothing is exported: this file only declares JSDoc typedefs
export {};
