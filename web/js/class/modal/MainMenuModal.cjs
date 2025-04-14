const BaseMenuModal = require("./BaseMenuModal.cjs")
const ClientAPI = require("../../class/API.cjs")
const PostQueue = require("../../class/PostQueue.cjs")
const QueueQuestionModal = require("./PopulatorQuestionModal.cjs")
class MainMenuModal extends BaseMenuModal {
	constructor(toyNoises) {
		super(true, toyNoises)
	}

	addConfigurationButton(modal) {
		this.configurationModal = modal
		this.addModalButton(modal, "Configuration")
	}

	addModalButton(modal, label) {
		this.addButton(label, () => {
			modal.open()
		})
	}

	addAgent(agent, labelerDid) {
		this.primaryAgent = agent
		this.primaryLabelerDid = labelerDid
	}

	addInterfaceButton(interfaceClass, name) {
		const button = document.createElement("button")
		button.textContent = name
		button.onclick = () => {
			const questionModal = new QueueQuestionModal(this.toyNoises)
			questionModal.on("populator", (runPopulator) => {
				const api = ClientAPI.fromSession(this.primaryAgent, this.primaryLabelerDid)
				const postQueue = new PostQueue(api, this.configurationModal)
				const rInterface = new interfaceClass(postQueue, this.toyNoises)
				postQueue.runningPopulator = runPopulator(postQueue)
				this.close()
				rInterface.open()
			})
			questionModal.on("earlyExit", () => {
				this.open()
			})
			questionModal.open()
		}
		this.modal.appendChild(button)
	}
}

module.exports = MainMenuModal
