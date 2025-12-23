import { BaseMenuModal } from "./BaseMenuModal.mjs"
import { ToyNoises } from "../sound/ToyNoises.mjs"
import { EventEmitter } from "events"

/**
 * Represents a configurable setting.
 */
class Setting extends EventEmitter {
	/**
	 * Creates a new Setting instance.
	 * @param {string} id - The unique identifier for the setting.
	 * @param {string} label - The display label for the setting.
	 * @param {string} type - The type of the setting (e.g., text, number, boolean, select).
	 * @param {*} defaultValue - The default value for the setting.
	 * @param {Object} [options={}] - Additional options for the setting.
	 */
	constructor(id, label, type, defaultValue, options = {}) {
		super()
		this.id = id
		this.label = label
		this.type = type
		this.options = options
		if (!this.options.overrideLoad) this.value = this.load() ?? defaultValue
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
	save(dry) {
		const data = { id: this.id, value: this.value }
		if (!dry) localStorage.setItem(Setting.keyPrefix + data.id, data.value)
		return data
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
		COLOR: "color",
		VISUAL_ELEMENT: "visualElement",
	}

	/**
	 * The prefix used for setting keys in local storage.
	 * @type {string}
	 */
	static keyPrefix = "rayleighSetting:"
}

class NumberRangeSetting extends Setting {
	/** */
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
	/** */
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
			label,
			input: inputElement,
		}
	}

	save(dry) {
		const data = { id: this.id, value: this.input.checked }
		if (!dry) localStorage.setItem(Setting.keyPrefix + data.id, data.value)
		return data
	}

	load() {
		if (localStorage.getItem(Setting.keyPrefix + this.id) == null) return null
		return localStorage.getItem(Setting.keyPrefix + this.id) === "true"
	}
}

class SelectSetting extends Setting {
	/** */
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
			label,
			input: inputElement,
		}
	}
}

class TextSetting extends Setting {
	/** */
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
			label,
			input: inputElement,
		}
	}
}

class ColorSetting extends Setting {
	/** */
	constructor(id, label, defaultValue) {
		super(id, label, Setting.settingType.COLOR, defaultValue)
	}

	createInputElement() {
		const inputElement = document.createElement("input")
		inputElement.setAttribute("type", "color")
		inputElement.setAttribute("id", this.id)
		inputElement.setAttribute("value", this.value)
		const label = document.createElement("label")
		label.setAttribute("for", this.id)
		label.textContent = this.label
		this.input = inputElement
		return {
			label,
			input: inputElement,
		}
	}
}

class DisplayElement extends Setting {
	/** */
	constructor(type, label) {
		super(type, label, Setting.settingType.VISUAL_ELEMENT, "", { serializable: false })
	}
}

class Divider extends DisplayElement {
	/** */
	constructor() {
		super("divider")
	}

	createInputElement() {
		const element = document.createElement("hr")
		return { label: element }
	}
}

class Header extends DisplayElement {
	/** */
	constructor(label, level) {
		super("header", label)
		this.level = level
	}

	createInputElement() {
		const element = document.createElement("h" + this.level)
		element.textContent = this.label
		return { label: element }
	}
}

class Text extends DisplayElement {
	/** */
	constructor(label) {
		super("text", label)
	}

	createInputElement() {
		const element = document.createElement("p")
		element.textContent = this.label
		return { label: element }
	}
}

/** Represents setting containing multiple ozher settings and multiple of itself */
class CompoundSetting extends Setting {
	/** */
	constructor(id, label, settingCompounds, options = { allowMultiple: false }) {
		options.overrideLoad = true
		super(id, label, Setting.settingType.VISUAL_ELEMENT, "", options)
		this.settingCompounds = settingCompounds
		this.value = this.load()
	}

	createInputElement() {
		if (this.options.allowMultiple) {
			const addButton = document.createElement("button")
			addButton.textContent = "Add"
			addButton.onclick = () => {
				const newSetting = this.addSetting()
				this.emit("add", newSetting)
			}
			this.input = addButton
			return { label: null, input: addButton }
		} else {
			return { label: null, input: null }
		}
	}

	addSetting() {
		const newSetting = this.settingCompounds.map((compound) => new compound.settingClass(...compound.params))
		// newSetting.forEach((setting, index) => setting.id = `${index}`)
		this.settings.push(newSetting)
		this.save()
		return newSetting
	}

	save(dry) {
		let data = this.settings.map((compound) => compound.map((setting) => setting.save(true)))
		if (!dry) localStorage.setItem(Setting.keyPrefix + this.id, JSON.stringify(data))
		return data
	}

	load() {
		const data = localStorage.getItem(Setting.keyPrefix + this.id)
		if (data == null) {
			console.log(this)
			this.settings = []
			if (this.options.allowMultiple) {
				this.settings = [] // starts empty. allow user to add if desired
			} else {
				this.settings = [this.addSetting()]
			}
			return this.save(true)
		}
		const parsed = JSON.parse(data)
		this.settings = parsed.map((setting) => {
			return setting.map((data, index) => {
				const compound = this.settingCompounds[index]
				const settingClass = compound.settingClass
				const settingInstance = new settingClass(...compound.params)
				settingInstance.value = data.value
				return settingInstance
			})
		})
		return parsed
	}

	static Compound(settingClass, params) {
		return {
			settingClass: settingClass,
			params: params,
		}
	}
}

class AccountCompound extends CompoundSetting {
	/** */
	constructor() {
		super("account", "Account", [CompoundSetting.Compound(TextSetting, ["handle", "Handle", "example.invalid"]), CompoundSetting.Compound(TextSetting, ["labelerDid", "Labeler DID", "did:plc:123"]), CompoundSetting.Compound(SelectSetting, ["labelerPermission", "Labeler permission", "moderator", { list: ["triage", "moderator", "admin", "system"] }])], { allowMultiple: false, compoundVersion: 1 })
	}
}

class LabelCompound extends CompoundSetting {
	/** */
	constructor() {
		super("label", "Labels", [CompoundSetting.Compound(TextSetting, ["slug", "Label slug", "example"]), CompoundSetting.Compound(TextSetting, ["readableName", "Label name", "Example"]), CompoundSetting.Compound(TextSetting, ["altKey", "Access key", "1"]), CompoundSetting.Compound(TextSetting, ["policy", "Policy", "Used as an example."]), CompoundSetting.Compound(ColorSetting, ["textColor", "Text color", "#000000"]), CompoundSetting.Compound(ColorSetting, ["backgroundColor", "Background color", "#ffffff"])], { allowMultiple: true, compoundVersion: 1 })
	}
}

export class ConfigurationModal extends BaseMenuModal {
	/** */
	constructor() {
		super()
		this.settings = []
		this.modal.classList.add("configurationModal")
		this.addCloseButton()
		// Settings
		this.addSetting(new Header("Configuration", 2))
		this.addSetting(new AccountCompound())
		this.addSetting(new LabelCompound())
		this.addSetting(new NumberRangeSetting("queuePreload", "Images to preload", 50, 1, 100))
		this.addSetting(new NumberRangeSetting("videoPreload", "Videos to preload", 6, 1, 100))
		this.addSetting(new NumberRangeSetting("queuePages", "Queue pages", 50, 1, 300))
		this.addSetting(new NumberRangeSetting("backQueueLimit", "Back queue size", 50, 1, 1000))
		this.addSetting(new BooleanSetting("noises", "Enable noises", true, { requiresReload: true }))
		this.addSetting(new BooleanSetting("fullscreen", "Always attempt fullscreen", false))
		this.addSetting(new SelectSetting("theme", "Theme", "Rayleigh", { list: ["Rayleigh", "Ozone"] }))
		this.addSetting(new NumberRangeSetting("maxDisplayedVideos", "Max videos to display at once", 2, 1, 64))
		this.addSetting(new BooleanSetting("autoplay", "Autoplay videos", true))
		this.addSetting(new BooleanSetting("unmuteVideos", "Unmute videos", false))
		this.addSetting(new NumberRangeSetting("videoSeekSeconds", "Video seek increment in seconds", 3, 0, 60))
		this.addSetting(new TextSetting("blurLabels", "Blur labels (Comma separated)", "!hide,!warn"))
		this.addSetting(new TextSetting("priorityTags", "Prioritize post subject tags (Comma separated)", "priority"))
		this.addSetting(new NumberRangeSetting("gridX", "Escalation grid X", 3, 1, 8))
		this.addSetting(new NumberRangeSetting("gridY", "Escalation grid Y", 3, 1, 8))
		this.addSetting(new SelectSetting("queue", "Queue", "open", { list: ["open", "escalated"] }))
		this.addSetting(new NumberRangeSetting("escalateCountScore", "Escalate record stat score", 10, -1000, 1000))
		this.addSetting(new NumberRangeSetting("reportCountScore", "Report record stat score", -1, -1000, 1000))
		this.addSetting(new NumberRangeSetting("likeScore", "Post like score", 1, -1000, 1000))
		this.addSetting(new Text("Some settings may require a page refresh to apply."))
		this.addSetting(new Divider())
		this.renderSettings()
	}

	addSetting(setting) {
		this.settings.push(setting)
	}

	getSetting(id) {
		return this.settings.find((setting) => setting.id === id)?.value ?? null
	}

	getCompoundSetting(id) {
		const setting = this.getSetting(id)
		const entries = []
		setting.forEach((settingEntry) => {
			const entry = {}
			settingEntry.forEach((setting) => {
				entry[setting.id] = setting.value
			})
			entries.push(entry)
		})
		return entries
	}

	/**Renders a setting to the modal.
	 * @param {Setting} setting - The setting to render.
	 * @param {Setting} [parent] - The parent setting, if applicable.
	 * @param {HTMLElement} [targetElement] - The target element to append the setting to.
	 */
	renderSetting(setting, parent, targetElement = this.modal) {
		parent = parent ?? setting
		const { label, input } = setting.createInputElement()
		if (input) {
			input.onchange = () => {
				setting.value = input.value ?? input.checked
				parent.save()
				parent.emit("change")
				this.toyNoises.playSound(ToyNoises.sounds.addLabel)
				if (setting.options?.requiresReload) {
					if (confirm("This setting requires a page reload to take effect. Reload now?")) {
						location.reload()
					}
				}
			}
			targetElement.appendChild(input)
		}
		if (label) {
			targetElement.appendChild(label)
		}
		// add line break
		targetElement.appendChild(document.createElement("br"))
	}

	renderSettings() {
		for (const setting of this.settings) {
			if (setting instanceof CompoundSetting) {
				setting.settings.forEach((compound) => compound.forEach((subSetting) => this.renderSetting(subSetting, setting)))
				setting.on("add", (newSetting) => newSetting.forEach((subSetting) => this.renderSetting(subSetting, setting)))
				this.renderSetting(setting)
			} else {
				this.renderSetting(setting)
			}
		}
	}
}

export default ConfigurationModal
