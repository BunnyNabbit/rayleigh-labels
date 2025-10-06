"use strict"

const path = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin")

module.exports = {
	mode: "development",
	entry: "./web/js/index.mjs",
	devtool: "source-map",
	output: {
		filename: "index.js",
		path: path.resolve(__dirname, "dist"),
		assetModuleFilename: "[path][name][ext]",
	},
	devServer: {
		static: path.resolve(__dirname, "dist"),
		port: 8080,
		hot: true,
	},
	plugins: [new HtmlWebpackPlugin({ template: "./web/index.html" })],
	module: {
		rules: [
			{
				test: /\.(png|svg|jpg|jpeg|gif|css)$/i,
				type: "asset/resource",
			},
		],
	},
}
