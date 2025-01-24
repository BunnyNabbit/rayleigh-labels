const BaseMenuModal = require("./BaseMenuModal.cjs")
const ToyNoises = require("../sound/ToyNoises.cjs")

/**
 * Represents a configurable setting.
 */
class Setting {
	/**
	 * Creates a new Setting instance.
	 * @param {string} id - The unique identifier for the setting.
	 * @param {string} label - The display label for the setting.
	 * @param {string} type - The type of the setting (e.g., text, number, boolean, select).
	 * @param {*} defaultValue - The default value for the setting.
	 * @param {Object} [options={}] - Additional options for the setting.
	 */
	constructor(id, label, type, defaultValue, options = {}) {
		this.id = id
		this.label = label
		this.type = type
		this.value = this.load() ?? defaultValue
		this.options = options
	}

	/**
	 * Loads the setting value from local storage.
	 * @returns {*} The loaded value, or null if not found.
	 */
	load() {
		return localStorage.getItem(Setting.keyPrefix + this.id)
	}

	/**
	 * Saves the current setting value to local storage.
	 */
	save() {
		localStorage.setItem(Setting.keyPrefix + this.id, this.value)
	}

	/**
	 * Resets the setting value to its default value.
	 */
	reset() {
		this.value = this.defaultValue
	}

	/**
	 * Enumeration of possible setting types.
	 * @enum {string}
	 */
	static settingType = {
		TEXT: "text",
		NUMBER: "number",
		BOOLEAN: "boolean",
		SELECT: "select",
		VISUAL_ELEMENT: "visualElement",
	}

	/**
	 * The prefix used for setting keys in local storage.
	 * @type {string}
	 */
	static keyPrefix = "rayleighSetting:"
}

class NumberRangeSetting extends Setting {
	constructor(id, label, defaultValue, minValue, maxValue, options) {
		super(id, label, Setting.settingType.NUMBER, defaultValue, options)
		this.minValue = minValue
		this.maxValue = maxValue
	}
	createInputElement() {
		const inputElement = document.createElement("input")
		inputElement.setAttribute("type", "number")
		inputElement.setAttribute("id", this.id)
		inputElement.setAttribute("value", this.value)
		inputElement.setAttribute("min", this.minValue)
		inputElement.setAttribute("max", this.maxValue)
		const label = document.createElement("label")
		label.setAttribute("for", this.id)
		label.textContent = this.label
		this.input = inputElement
		return { label, input: inputElement }
	}
}

class BooleanSetting extends Setting {
	constructor(id, label, defaultValue, options) {
		super(id, label, Setting.settingType.BOOLEAN, defaultValue, options)
	}
	createInputElement() {
		const inputElement = document.createElement("input")
		inputElement.setAttribute("type", "checkbox")
		inputElement.setAttribute("id", this.id)
		inputElement.checked = this.value
		const label = document.createElement("label")
		label.setAttribute("for", this.id)
		label.textContent = this.label
		this.input = inputElement
		return {
			label, input: inputElement
		}
	}
	save() {
		localStorage.setItem(Setting.keyPrefix + this.id, this.input.checked)
	}
	load() {
		if (localStorage.getItem(Setting.keyPrefix + this.id) == null) return null
		return localStorage.getItem(Setting.keyPrefix + this.id) === "true"
	}
}

class SelectSetting extends Setting {
	constructor(id, label, defaultValue, options) {
		super(id, label, Setting.settingType.SELECT, defaultValue, options)
	}
	createInputElement() {
		const inputElement = document.createElement("select")
		inputElement.setAttribute("id", this.id)
		for (const option of this.options.list) {
			const optionElement = document.createElement("option")
			optionElement.value = option
			optionElement.textContent = option
			if (option === this.value) {
				optionElement.selected = true
			}
			inputElement.appendChild(optionElement)
		}
		const label = document.createElement("label")
		label.setAttribute("for", this.id)
		label.textContent = this.label
		this.input = inputElement
		return {
			label, input: inputElement
		}
	}
}

class TextSetting extends Setting {
	constructor(id, label, defaultValue) {
		super(id, label, Setting.settingType.TEXT, defaultValue)
	}
	createInputElement() {
		const inputElement = document.createElement("input")
		inputElement.setAttribute("type", "text")
		inputElement.setAttribute("id", this.id)
		inputElement.setAttribute("value", this.value)
		const label = document.createElement("label")
		label.setAttribute("for", this.id)
		label.textContent = this.label
		this.input = inputElement
		return {
			label, input: inputElement
		}
	}
}

class Divider extends Setting {
	constructor() {
		super("divider", "divider", Setting.settingType.VISUAL_ELEMENT, "")
	}
	createInputElement() {
		const element = document.createElement("hr")
		return { label: element }
	}
}

class Header extends Setting {
	constructor(label, level) {
		super("header", label, Setting.settingType.VISUAL_ELEMENT, "")
		this.level = level
	}
	createInputElement() {
		const element = document.createElement("h" + this.level)
		element.textContent = this.label
		return { label: element }
	}
}

class Text extends Setting {
	constructor(label) {
		super("text", label, Setting.settingType.VISUAL_ELEMENT, "")
	}
	createInputElement() {
		const element = document.createElement("p")
		element.textContent = this.label
		return { label: element }
	}
}

class ConfigurationModal extends BaseMenuModal {
	constructor() {
		super()
		this.previousMenu = null
		this.settings = []
		this.modal.classList.add("configurationModal")
		this.addCloseButton()
		// Settings
		this.addSetting(new Header("Configuration", 2))
		this.addSetting(new NumberRangeSetting("queuePreload", "Posts to preload", 50, 1, 100))
		this.addSetting(new BooleanSetting("noises", "Enable noises", true, { requiresReload: true }))
		this.addSetting(new SelectSetting("theme", "Theme", "Rayleigh", { list: ["Rayleigh", "Ozone"] }))
		this.addSetting(new BooleanSetting("autoplay", "Autoplay videos", true))
		this.addSetting(new BooleanSetting("unmuteVideos", "Unmute videos", false))
		this.addSetting(new TextSetting("blurLabels", "Blur labels (Comma separated)", "!hide,!warn"))
		this.addSetting(new Text("Some settings may require a page refresh to apply."))
		// Restrained Rayleigh. Use localStorage.setItem(`rayleighSetting:restraints`, "true") to enable
		if (localStorage.getItem(`${Setting.keyPrefix}restraints`) == "true") { // a bit hacky, since a setting cannot be accessed if it doesn't exist
			this.addSetting(new Divider())
			this.addSetting(new Header("Restrained Rayleigh", 2))
			this.addSetting(new Text("RR is an experimental tool. Use of restraints may not be suitable for some users."))
			this.addSetting(new BooleanSetting("restraints", "Enable RR", false))
			this.addSetting(new Header("Post viewing", 3))
			this.addSetting(new NumberRangeSetting("minPostViewTIme", "View time", 10, 1, 60))
			this.addSetting(new TextSetting("postViewTimeTrigger", "Trigger code", "alert(\"Be for real.\")"))
		}
		this.renderSettings()
		this.modal.addEventListener("close", () => this.previousMenu?.open())
	}

	addSetting(setting) {
		this.settings.push(setting)
	}

	getSetting(id) {
		return this.settings.find((setting) => setting.input?.id === id)?.value ?? null
	}

	renderSettings() {
		for (const setting of this.settings) {
			const { label, input } = setting.createInputElement()
			if (input) {
				input.onchange = () => {
					setting.value = input.value ?? input.checked
					setting.save()
					this.toyNoises.playSound(ToyNoises.sounds.addLabel)
					if (setting.options?.requiresReload) {
						if (confirm("This setting requires a page reload to take effect. Reload now?")) {
							location.reload()
						}
					}
				}
				this.modal.appendChild(input)
			}
			if (label) {
				this.modal.appendChild(label)
			}
			// add line break
			this.modal.appendChild(document.createElement("br"))
		}
	}

	close() {
		super.close()
	}
}

module.exports = ConfigurationModal
