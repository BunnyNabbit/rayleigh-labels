const PostQueue = require("../PostQueue.cjs")
const BaseQueuePopulator = require("./BaseQueuePopulator.cjs")
const { chunkArray } = require("../../utils.cjs")
const API = require("../API.cjs")

class SearchPopulator extends BaseQueuePopulator {
	constructor(postQueue) {
      super(postQueue)
	}
   async populate() {
      super.populate()
      const queueType = this.postQueue.configurationModal.getSetting("queue")
		const response = await this.postQueue.api.getReports(queueType, this.postQueue.configurationModal.getSetting("queuePages"))
		const tagUriCache = new Set()
		const recordStatCache = new Map()
		const escalateScore = this.postQueue.configurationModal.getSetting("escalateCountScore")
		const reportScore = this.postQueue.configurationModal.getSetting("reportCountScore")
		const likeScore = this.postQueue.configurationModal.getSetting("likeScore")
		const tagList = this.postQueue.configurationModal.getSetting("priorityTags").split(",")
		response.forEach(report => {
			report.tags.forEach(tag => {
				if (tagList.includes(tag)) {
					tagUriCache.add(report.subject.uri)
				}
			})
			if (typeof report.recordsStats.escalatedCount === "number") {
				recordStatCache.set(report.subject.uri, report.recordsStats)
			}
		})
		let reportQueue = []
		const uris = response.map(report => report.subject.uri).filter(element => element)
		const promises = []
		chunkArray(uris, API.bulkHydrateLimit).forEach(postChunk => {
			const hydratePromise = this.postQueue.api.hydratePosts(postChunk)
			promises.push(hydratePromise)
			hydratePromise.then(response => {
				const posts = response.posts
				const filteredPosts = PostQueue.filterTransformEmbedTypes(posts)
				const missingUris = postChunk.filter(uri => !posts.some(post => post.uri == uri))
				reportQueue = reportQueue.concat(missingUris.filter(uri => uri.includes("/app.bsky.feed.post/")))
				console.log({ missingUris: reportQueue.join(",") })
				filteredPosts.forEach(post => {
					post.tagged = tagUriCache.has(post.uri)
               this.postQueue.queue.push(post)
               this.emit("post", post)
				})
			})
      })
		await Promise.allSettled(promises)
      this.emit("sort", () => {
			this.postQueue.queue.forEach(post => {
				let score = post.likeCount * likeScore
				const recordStats = recordStatCache.get(post.uri)
				if (recordStats) {
					score += recordStats.escalatedCount * escalateScore
					score += recordStats.reportedCount * reportScore
				}
				post.score = score
			})
			this.postQueue.queue = this.postQueue.queue.sort((a, b) => a.renderImages.length - b.renderImages.length)
				.sort((a, b) => (b.score) - (a.score))
				.sort((a, b) => b.tagged - a.tagged)
      })
      this.running = false
	}
	static sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms))
	}
	static searchDelay = 5000
}

module.exports = SearchPopulator