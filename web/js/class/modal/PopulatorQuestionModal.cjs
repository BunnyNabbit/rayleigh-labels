const BaseMenuModal = require("./BaseMenuModal.cjs")
const SearchPopulator = require("../populator/SearchPopulator.cjs")
const ReportQueuePopulator = require("../populator/ReportQueuePopulator.cjs")

class PopulatorQuestionModal extends BaseMenuModal {
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

module.exports = PopulatorQuestionModal
