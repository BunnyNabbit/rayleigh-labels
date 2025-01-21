const API = require("./API.cjs")
const { randomIntFromInterval, chunkArray } = require("../utils.cjs")

class PostQueue {
	constructor(api) {
		this.api = api
		this.queue = []
		this.backQueue = []
		this.currentPost = null
		this.viewedAll = false
		this.interface = null
		// populate queue
		this.getSet()
	}
	// Get the next set of posts
	getSet() {
		this.populateQueue().then(() => {
			if (this.queue[0]) {
				this.interface.displayPost(this.queue[0])
			} else {
				alert(PostQueue.funnyEmptyQueueMessages[randomIntFromInterval(0, PostQueue.funnyEmptyQueueMessages.length - 1)])
			}
		}).catch((err) => {
			alert("Error while getting queue")
			console.error(err)
		})
	}

	async populateQueue() {
		const response = await this.api.getReports()
		const uris = response.map(report => report.subject.uri).filter(element => element)
		const promises = []
		chunkArray(uris, API.bulkHydrateLimit).forEach(postChunk => {
			const hydratePromise = this.api.hydratePosts(postChunk)
			promises.push(hydratePromise)
			hydratePromise.then(response => {
				const posts = response.posts
				const filteredPosts = PostQueue.filterTransformEmbedTypes(posts)
				filteredPosts.forEach(post => {
					this.queue.push(post)
				})
			})
		})
		Promise.allSettled(promises).then(() => {
			this.queue = this.queue.sort((a, b) => a.renderImages.length - b.renderImages.length)
				.sort((a, b) => b.likeCount - a.likeCount)
		})
		return Promise.allSettled(promises)
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
		"YOU'RE WINNER"
	]
	static backQueueLimit = 50
}

module.exports = PostQueue
