/** @type {import("prettier").Config} */
export default {
	semi: false,
	plugins: ["prettier-plugin-drone-class", "prettier-plugin-drone-jsdoc"],
	printWidth: Infinity,
	trailingComma: "es5",
	useTabs: true,
	endOfLine: "auto",
}
