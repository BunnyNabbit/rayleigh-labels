const ToyNoises = require("../sound/ToyNoises.cjs")
const EventEmitter = require("events")

/** Base class for creating modal dialogs.*/
class BaseMenuModal extends EventEmitter {
	/**Creates an instance of BaseMenuModal.
	 * @param {boolean} preventDialogClose If true, prevents the dialog from closing when the Escape key is pressed.
	 * @param {ToyNoises} toyNoises An instance of ToyNoises for playing sounds.
	 * @returns {BaseMenuModal} The created instance of BaseMenuModal.
	 * @constructor
	 */
	constructor(preventDialogClose, toyNoises) {
		super()
		this.toyNoises = toyNoises
		this.modal = document.createElement("dialog")
		document.body.appendChild(this.modal)
		if (preventDialogClose) {
			this.modal.addEventListener("keydown", (event) => {
				if (event.key === "Escape") {
					event.preventDefault()
					this.toyNoises.playSound(ToyNoises.sounds.lastInPost)
				}
			})
		}
		this.modal.addEventListener("close", () => this.toyNoises.playSound(ToyNoises.sounds.removeLabel))
	}

	addCloseButton() {
		const closeButton = document.createElement("span")
		closeButton.innerHTML = "&times;"
		closeButton.classList.add("close")
		closeButton.onclick = () => this.close()
		this.modal.appendChild(closeButton)
		return closeButton
	}

	addButton(text, func) {
		const button = document.createElement("button")
		button.textContent = text
		button.onclick = func
		this.modal.appendChild(button)
		return button
	}

	open() {
		this.modal.showModal()
		return this.modal
	}

	close() {
		this.modal.close()
		return this.modal
	}

	destroy() {
		this.modal.remove()
	}
}

module.exports = BaseMenuModal
