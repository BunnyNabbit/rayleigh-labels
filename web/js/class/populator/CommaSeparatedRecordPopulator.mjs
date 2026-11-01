import { PostQueue } from "../PostQueue.mjs"
import { chunkArray } from "../../utils.mjs"
import { BaseQueuePopulator } from "./BaseQueuePopulator.mjs"
import { ClientAPI } from "../ClientAPI.mjs"

export class CommaSeparatedRecordPopulator extends BaseQueuePopulator {
	/**/
	constructor(postQueue) {
		super(postQueue)
	}
	/** @param {string} query */
	async populate(query = this.query) {
		/** @type {string} */
		this.query = query
		super.populate()
		// TODO: Dexie exlcude acknowledged.
		// TODO: Maybe use a regex for deduplicating spaces? Or just remove all spaces? seems brittle, zhough...
		const postChunks = chunkArray(query.replaceAll(", ", ",").split(","), ClientAPI.bulkHydrateLimit)
		const promises = []
		// TODO: somweh~wat identical to ReportQueuePopulator! Too bad... it be very smol... wittedwittedwittedwittedwitted rose
		for (const postChunk of postChunks) {
			await CommaSeparatedRecordPopulator.sleep(CommaSeparatedRecordPopulator.hydrateDelay)
			const hydratePromise = this.postQueue.api.hydratePosts(postChunk)
			promises.push(hydratePromise)
			hydratePromise.then((response) => {
				const posts = response.posts
				const filteredPosts = PostQueue.filterTransformEmbedTypes(posts)
				filteredPosts.forEach((post) => {
					this.postQueue.queue.push(post)
					this.emit("post", post)
				})
			})
		}
		await Promise.allSettled(promises)
		this.running = false
	}

	static sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
	static hydrateDelay = 250
}

export default CommaSeparatedRecordPopulator
