import { PostQueue } from "../PostQueue.mjs"
import { BaseQueuePopulator } from "./BaseQueuePopulator.mjs"
import { db } from "../../db.mjs"
import { randomIntFromInterval } from "../../utils.mjs"

class Cursor {
	/**@param {SearchPopulator} searchPopulator
	 * @param {string} query
	 */
	constructor(searchPopulator, query) {
		/** @type {SearchPopulator} */
		this.searchPopulator = searchPopulator
		/** @type {string} */
		this.query = query
		/**The next cursor, or the state of the cursor, depending on the type.
		 *
		 * - If `null`, I am prepared to search without a cursor. asd
		 * - If `false`, I have reached the end of the query. I should not continue. I am æffectively dead.
		 * - If `string`, that's my next cursor.
		 *
		 * @type {false | string | null}
		 */
		this.nextCursor = null
	}
	/** @todo Return result? More of a ClientAPI issue IMO... Still. Not ideal! */
	async next() {
		const result = await this.searchPopulator.postQueue.api.searchPosts(this.query, this.nextCursor).catch((error) => {
			this.nextCursor = false
			throw error
		})
		if (result.data.cursor) {
			this.nextCursor = result.data.cursor
		} else {
			// I should not continue. I am æffectively dead.
			this.nextCursor = false
		}
		return result
		// if (!cursor) break
	}
}

export class SearchPopulator extends BaseQueuePopulator {
	/**/
	constructor(postQueue) {
		super(postQueue)
		/** @type {Cursor[]} */
		this.cursors = []
	}
	/** Mutates my {@link cursors}, replacing it with a new array of cursors which aren't dead. I return an alive cursor. Or `false`, if they all died. */
	pickRandomRemainingCursor() {
		this.cursors = this.cursors.filter((cursor) => cursor.nextCursor !== false)
		if (this.cursors.length === 0) return false
		return this.cursors[randomIntFromInterval(0, this.cursors.length - 1)]
	}

	async populate(query) {
		super.populate()
		// Split by "," and initialize cursors.
		query.split(",").forEach((eachQuery) => {
			this.cursors.push(new Cursor(this, eachQuery))
		})
		while (true) {
			await SearchPopulator.sleep(SearchPopulator.searchDelay) // Avoid hammering the API too fast
			const cursor = this.pickRandomRemainingCursor()
			if (!cursor) break
			const result = await cursor.next().catch((error) => {
				this.running = false
				throw error
			})
			for (const post of result.data.posts) {
				// check if acknowledged before
				db.acknowledgedPosts.get(post.uri).then((ack) => {
					if (!ack) {
						let hasLabel = false
						post.labels.forEach((label) => {
							if (this.labelValues.has(label.val)) hasLabel = true
						})
						if (!hasLabel) {
							PostQueue.filterTransformEmbedTypes([post]).forEach((post) => {
								this.postQueue.queue.push(post)
								this.emit("post", post)
							})
						} else {
							// already has a label. hide it and mark it as escalated.
							db.acknowledgedPosts.put({ uri: post.uri, resolution: true })
						}
					}
				})
			}
		}
		this.running = false
	}

	static sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
	static searchDelay = 100
}

export default SearchPopulator
