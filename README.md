# Timeline
Draw a timeline graph in SVG.

## Setup
### Manual
Copy the `src` folder as `timeline` somewhere in your project.

Import the CSS:
```
@import url(timeline/timeline.css);
```

In your JavaScript code:
```
import {Timeline} from 'timeline/timeline.js';
```

### With NPM and Webpack
The instructions below are for those who are using NPM and Webpack.

This library is distributed using GitHub NPM registry. You must register this registry for the scope `@rodano`:

```
npm config set @rodano:registry https://npm.pkg.github.com
```

Install as an NPM dependency of your project:
```
npm i @rodano/timeline --save
```

In your CSS:
```
@import url(~@rodano/timeline/src/timeline.css);
```
Pay attention to the `src` folder in the path. And make sure you configured Webpack to handle CSS files.

In your code:
```
import {Timeline} from '@rodano/timeline';
```

## Development
The instructions below are for developers.

### Example page
To manually test the project using the example page, run:
```
npm start
```
This will launch a Webpack development server on port 9000.

### Lint
You can lint the project with the following command:
```
npm run lint
```

### Type check
You can check the code using the Typescript compiler:
```
npm run tsc
```
