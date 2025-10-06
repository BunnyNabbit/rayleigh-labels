import { BaseMenuModal } from "./BaseMenuModal.mjs"
import { SearchPopulator } from "../populator/SearchPopulator.mjs"
import { ReportQueuePopulator } from "../populator/ReportQueuePopulator.mjs"

export class PopulatorQuestionModal extends BaseMenuModal {
	/** */
	constructor(toyNoises) {
		super(false, toyNoises)
		this.addCloseButton()
		this.modal.addEventListener("close", () => this.destroy())
		this.addButton("Ozone report queue", () => {
			this.emit("populator", (postQueue) => {
				return new ReportQueuePopulator(postQueue).populate()
			})
			this.close()
		})
		this.addButton("Search for posts", () => {
			this.emit("populator", (postQueue) => {
				return new SearchPopulator(postQueue).populate(prompt("Search for posts: "))
			})
			this.close()
		})
	}
}

export default PopulatorQuestionModal
