const EventEmitter = require("events")
const PostQueue = require("./PostQueue.cjs")
const db = require("../db.cjs")

class AsyncQueueGetter extends EventEmitter {
	constructor(postQueue) {
		super()
		this.postQueue = postQueue
		this.running = false
		this.labelValues = new Set()
		const labels = this.postQueue.getLabels()
		labels.forEach(label => {
			this.labelValues.add(label.slug)
		})
	}
	async populateSearchQueue(query) {
		let cursor = null
		this.running = true
		while (true) {
			await AsyncQueueGetter.sleep(AsyncQueueGetter.searchDelay) // Avoid hammering the API too fast
			const result = await this.postQueue.api.searchPosts(query, cursor).catch(err => {
				this.running = false
				this.emit("error", err)
			})
			if (!result.data) break
			for (const post of result.data.posts) {
				// check if acknowledged before
				db.acknowledgedPosts.get(post.uri).then(ack => {
					if (!ack) {
						let hasLabel = false
						post.labels.forEach(label => {
							if (this.labelValues.has(label.val)) {
								hasLabel = true
							}
						})
						if (!hasLabel) {
							PostQueue.filterTransformEmbedTypes([post]).forEach(post => {
								this.postQueue.queue.push(post)
								this.emit("post", post)
							})
						} else { // already has a label. hide it and mark it as escalated.
							db.acknowledgedPosts.put({ uri: post.uri, resolution: true })
						}
					}
				})
			}
			cursor = result.data.cursor
			if (!cursor) break
		}
		this.running = false
	}
	static sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms))
	}
	static searchDelay = 5000
}

module.exports = AsyncQueueGetter