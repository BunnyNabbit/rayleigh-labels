const { randomIntFromInterval } = require("../utils.cjs")
const db = require("../db.cjs")

class PostQueue {
	constructor(api, configurationModal) {
		this.api = api
		this.configurationModal = configurationModal
		this.queue = []
		this.backQueue = []
		this.interface = null
		this.runningPopulator = null
	}
	// Get the next set of posts
	getSet() {
		this.populateQueue().then(() => {
			console.log("Queue populated")
			this.runningPopulator = null
			if (this.queue[0]) {
				this.interface.displaySet()
			} else {
				alert(PostQueue.funnyEmptyQueueMessages[randomIntFromInterval(0, PostQueue.funnyEmptyQueueMessages.length - 1)])
			}
		}).catch((err) => {
			alert("Error while getting queue")
			console.error(err)
		})
	}

	async populateQueue() {
		if (this.populator.running) {
			console.log("using promise")
			return this.runningPopulator
		}
		console.log("running")
		this.runningPopulator = this.populator.populate()
		await this.runningPopulator
	}

	escalatePost(post) {
		this.api.escalate(post.uri)
		post.escalated = true
	}

	dbAcknowledgePost(post, resolution) {
		return db.acknowledgedPosts.put({ uri: post.uri, resolution }) // add skipped posts from escalation queue-NOT-labeling
	}

	labelPost(post, add, negate) {
		this.api.label({
			add, negate, uri: post.uri
		})
		post.labels = post.labels.filter(label => !negate.includes(label.val))
		add.forEach(label => post.labels.push({ val: label }))
	}

	getLabels() {
		return this.configurationModal.getCompoundSetting("label")
	}

	static filterTransformEmbedTypes(posts) {
		const supportedTypes = ["app.bsky.embed.images#view", "app.bsky.embed.recordWithMedia#view", "app.bsky.embed.video#view"]
		console.log("posts", posts)
		const filteredPosts = posts.filter(post => {
			return post.embed && supportedTypes.includes(post.embed["$type"])
		})
		filteredPosts.forEach(post => {
			console.log(post)
			const type = post.embed["$type"]
			if (type == "app.bsky.embed.images#view") {
				post.renderImages = post.embed.images
			}
			if (type == "app.bsky.embed.recordWithMedia#view") {
				if (post.embed.media["$type"] == "app.bsky.embed.images#view") {
					post.renderImages = post.embed.media.images
				}
				if (post.embed.media["$type"] == "app.bsky.embed.video#view") {
					post.renderImages = [post.embed.media]
				}
				if (post.embed.media["$type"] == "app.bsky.embed.external#view" && post.embed.media["$type"].external.thumb) {
					post.renderImages = [{
						fullsize: post.embed.media["$type"].external.thumb
					}]
				}
			}
			if (type == "app.bsky.embed.video#view") {
				post.renderImages = [post.embed]
			}
		})
		return filteredPosts
	}
	static funnyEmptyQueueMessages = [
		"Incredible! You're a real bridge raiser!",
		"YOU'RE WINNER !",
		"2021 appliances: *Break within two years.",
		"Unfortunately, the queue is empty.",
		"Congratulations! You've reached the end of the internet!",
		"Wow! You're really good at this!",
		"Good job! You've done it!",
		"A WINNER IS YOU",
		"glad you did it babe",
		"i've won...... but at what cost?"
	]
}

module.exports = PostQueue
