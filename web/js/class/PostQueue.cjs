const API = require("./API.cjs")
const { randomIntFromInterval, chunkArray } = require("../utils.cjs")

class PostQueue {
	constructor(api, configurationModal) {
		this.api = api
		this.configurationModal = configurationModal
		this.queue = []
		this.backQueue = []
		this.interface = null
	}
	// Get the next set of posts
	getSet() {
		this.populateQueue().then(() => {
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
		const queueType = this.configurationModal.getSetting("queue")
		const response = await this.api.getReports(queueType)
		const tagUriCache = new Set()
		const tagList = this.configurationModal.getSetting("priorityTags").split(",")
		response.forEach(report => {
			report.tags.forEach(tag => {
				if (tagList.includes(tag)) {
					tagUriCache.add(report.subject.uri)
				}
			})
		})
		let tmp = []
		const uris = response.map(report => report.subject.uri).filter(element => element)
		const promises = []
		chunkArray(uris, API.bulkHydrateLimit).forEach(postChunk => {
			const hydratePromise = this.api.hydratePosts(postChunk)
			promises.push(hydratePromise)
			hydratePromise.then(response => {
				const posts = response.posts
				const filteredPosts = PostQueue.filterTransformEmbedTypes(posts)
				const missingUris = postChunk.filter(uri => !posts.some(post => post.uri == uri))
				tmp = tmp.concat(missingUris.filter(uri => uri.includes("/app.bsky.feed.post/")))
				console.log({ missingUris: tmp.join(",") })
				filteredPosts.forEach(post => {
					post.tagged = tagUriCache.has(post.uri)
					this.queue.push(post)
				})
			})
		})
		Promise.allSettled(promises).then(() => {
			this.queue = this.queue.sort((a, b) => a.renderImages.length - b.renderImages.length)
				.sort((a, b) => b.likeCount - a.likeCount)
				.sort((a, b) => b.tagged - a.tagged)
		})
		return Promise.allSettled(promises)

	}

	escalatePost(post) {
		this.api.escalate(post.uri)
		post.escalated = true
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
