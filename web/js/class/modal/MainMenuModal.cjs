const BaseMenuModal = require("./BaseMenuModal.cjs")
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

	addInterfaceButton(rInterface, name) {
		this.interface = rInterface
		const button = document.createElement("button")
		button.textContent = name
		button.onclick = () => {
			this.close()
			rInterface.open()
		}
		this.modal.appendChild(button)
	}
}

module.exports = MainMenuModal
