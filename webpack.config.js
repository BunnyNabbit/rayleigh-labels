"use strict"

const path = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin")

module.exports = {
	mode: "development",
	entry: "./web/js/index.jsx",
	devtool: "source-map",
	output: {
		filename: "index.[hash].js",
		path: path.resolve(__dirname, "dist"),
		assetModuleFilename: "[path][name][ext]",
	},
	devServer: {
		static: path.resolve(__dirname, "dist"),
		port: 8080,
		hot: true,
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: "./web/index.html",
		}),
	],
	module: {
		rules: [
			{
				test: /\.(js|mjs|cjs|jsx)$/,
				exclude: /node_modules/,
				use: ["babel-loader"],
			},
			{
				test: /\.react.css$/,
				use: [
					{
						loader: "style-loader",
					},
					{
						loader: "css-loader",
						options: {
							modules: true,
							localsConvention: "camelCase",
							sourceMap: true,
						},
					},
				],
			},
			{
				test: /\.(png|svg|jpg|jpeg|gif|css)$/i,
				type: "asset/resource",
			},
		],
	},
}
