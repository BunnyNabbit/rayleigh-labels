const BaseMenuModal = require("./BaseMenuModal.cjs")
const API = require("../../class/API.cjs")
const PostQueue = require("../../class/PostQueue.cjs")
class MainMenuModal extends BaseMenuModal {
	constructor(toyNoises) {
		super(true, toyNoises)
	}

	addConfigurationButton(configurationModal) {
		this.configurationModal = configurationModal
		this.configurationModal.previousMenu = this
		const button = document.createElement("button")
		button.textContent = "Configuration"
		button.onclick = () => {
			this.close()
			configurationModal.open()
		}
		this.modal.appendChild(button)
	}

	addInterfaceButton(interfaceClass, name) {
		const button = document.createElement("button")
		button.textContent = name
		button.onclick = () => {
			const api = new API()
			const postQueue = new PostQueue(api, this.configurationModal)
			const rInterface = new interfaceClass(postQueue, this.toyNoises)
			this.close()
			rInterface.open()
		}
		this.modal.appendChild(button)
	}
}

module.exports = MainMenuModal
