const EventEmitter = require("events")

class BaseQueuePopulator extends EventEmitter {
   constructor(postQueue) {
      super()
      this.postQueue = postQueue
      postQueue.populator = this
      this.running = false
      this.labelValues = new Set()
      const labels = this.postQueue.getLabels()
      labels.forEach(label => {
         this.labelValues.add(label.slug)
      })
      this.on("error", (err) => {
         console.error(err)
         alert("Error while populating queue")
         this.running = false
      })
   }
   async populate() {
      this.running = true
   }
   static sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
   }
   static searchDelay = 5000
}

module.exports = BaseQueuePopulator