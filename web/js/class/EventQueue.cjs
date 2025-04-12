class EventQueue {
	constructor() {
		this.queue = []
		this.isProcessing = false
		this.retryDelays = [1000, 2000, 4000, 8000, 12000, 18000, 30000] // Exponential backoff delays
		window.addEventListener('beforeunload', (event) => {
			if (this.pendingCount > 0) {
				event.preventDefault()
			}
		})
	}
	/** Add an event to the queue */
	enqueue(event, volatile = false) {
		this.queue.push({ event, retries: 0, volatile })
		this.processQueue()
	}
	/** Process the queue */
	async processQueue() {
		if (this.isProcessing || this.queue.length === 0) return

		this.isProcessing = true

		while (this.queue.length > 0) {
			const { event, retries, volatile } = this.queue[0]

			try {
				await event()
				this.queue.shift() // Remove the event from the queue on success
			} catch (error) {
				if (retries < this.retryDelays.length || volatile) {
					this.queue[0].retries += 1
					await EventQueue.sleep(this.retryDelays[retries])
				} else {
					if (!volatile) console.error('Event failed after maximum retries:', event, error)
					this.queue.shift()
				}
			}
		}

		this.isProcessing = false
	}

	static sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	get pendingCount() {
		return this.queue.length
	}
}

module.exports = EventQueue
