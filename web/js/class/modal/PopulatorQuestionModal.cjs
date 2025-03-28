const BaseMenuModal = require("./BaseMenuModal.cjs")
const SearchPopulator = require("../populator/SearchPopulator.cjs")
const ReportQueuePopulator = require("../populator/ReportQueuePopulator.cjs")

class PopulatorQuestionModal extends BaseMenuModal {
   constructor(toyNoises) {
      super(true, toyNoises)
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

   addCloseButton() {
      const closeButton = super.addCloseButton()
      closeButton.onclick = () => {
         this.emit("earlyExit")
      }
   }

   addButton(text, func) {
      const button = document.createElement("button")
      button.textContent = text
      button.onclick = func
      this.modal.appendChild(button)
      return button
   }
}

module.exports = PopulatorQuestionModal
