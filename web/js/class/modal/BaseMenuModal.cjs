const ToyNoises = require("../sound/ToyNoises.cjs")

class BaseMenuModal {
	constructor(preventDialogClose, toyNoises) {
		this.toyNoises = toyNoises
		this.modal = document.createElement("dialog")
		document.body.appendChild(this.modal)
		if (preventDialogClose) {
			this.modal.addEventListener('keydown', (event) => {
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

	open() {
		this.modal.showModal()
		return this.modal
	}

	close() {
		this.modal.close()
		return this.modal
	}
}

module.exports = BaseMenuModal