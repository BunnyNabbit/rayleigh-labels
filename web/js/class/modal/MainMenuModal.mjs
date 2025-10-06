import { BaseMenuModal } from "./BaseMenuModal.mjs"
import { ClientAPI } from "../../class/ClientAPI.mjs"
import { PostQueue } from "../../class/PostQueue.mjs"
import { PopulatorQuestionModal } from "./PopulatorQuestionModal.mjs"
export class MainMenuModal extends BaseMenuModal {
	/** */
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
			const questionModal = new PopulatorQuestionModal(this.toyNoises)
			questionModal.on("populator", (runPopulator) => {
				const api = ClientAPI.fromSession(this.primaryAgent, this.primaryLabelerDid)
				const postQueue = new PostQueue(api, this.configurationModal)
				const rInterface = new interfaceClass(postQueue, this.toyNoises)
				postQueue.runningPopulator = runPopulator(postQueue)
				this.close()
				rInterface.open()
			})
			questionModal.open()
		}
		this.modal.appendChild(button)
	}
}

export default MainMenuModal
