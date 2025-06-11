import * as path from 'path';
import {fileURLToPath} from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
	mode: 'development',
	optimization: {
		minimize: false
	},
	devtool: 'source-map',
	context: path.resolve(__dirname, 'example'),
	entry: [
		'./index.js',
		'./index.css'
	],
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].bundle.js'
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, 'example', 'index.html'),
			inject: 'head',
			xhtml: true
		}),
		new CopyPlugin({
			patterns: [
				{from: '*.png'},
				{from: '*.json'}
			],
		})
	],
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					'style-loader',
					'css-loader'
				]
			}
		]
	},
	devServer: {
		port: 9000,
		host: '0.0.0.0'
	}
};
