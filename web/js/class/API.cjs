const { Agent } = require("@atproto/api")
const EventQueue = require("./EventQueue.cjs")

class ClientAPI {
	/**
	 * @param {Agent} agent
	 * @param {string} labelerDid
	 */
	constructor(agent, labelerDid) {
		this.agent = agent
		this.labelerDid = labelerDid
		this.agent.addLabeler(labelerDid)
		this.eventQueue = new EventQueue()
	}

	async hydratePosts(uris) {
		for (let i = 0; i <= ClientAPI.maxRetries; i++) {
			try {
				const response = await this.agent.getPosts({ uris })
				return response.data
			} catch (error) {
				if (i === ClientAPI.maxRetries) {
					throw error
				} else {
					console.warn(`Attempt ${i + 1} failed, retrying...`)
					await new Promise((resolve) => setTimeout(resolve, 1000))
				}
			}
		}
	}

	queryStatuses(cursor, queue) {
		const body = {
			limit: 100,
			includeMuted: true,
			sortField: "lastReportedAt",
			sortDirection: "desc",
			reviewState: queue,
		}
		if (cursor) body.cursor = cursor
		return this.agent.tools.ozone.moderation.queryStatuses(body, {
			encoding: "application/json",
			headers: {
				"atproto-proxy": `${this.labelerDid}#atproto_labeler`,
			},
		})
	}

	async getReports(queueParam, queuePages) {
		let queue = "tools.ozone.moderation.defs#reviewOpen"
		if (queueParam == "escalated") {
			queue = "tools.ozone.moderation.defs#reviewEscalated"
		}
		let reports = []
		function fail() {
			throw new Error("Failed to get queue")
		}
		let cursor = null
		for (let i = 0; i <= queuePages; i++) {
			try {
				const statusResponse = await this.queryStatuses(cursor, queue)
				cursor = statusResponse.data.cursor
				reports = reports.concat(statusResponse.data.subjectStatuses)
				if (cursor) {
					if (i == queuePages) {
						return reports
					}
					continue
				} else {
					return reports
				}
			} catch (error) {
				if (i === queuePages) {
					console.error(error)
					if (reports.length) {
						return reports
					} else {
						fail()
					}
				} else {
					console.warn(`Attempt ${i + 1} failed, retrying...`)
					await new Promise((resolve) => setTimeout(resolve, 1000))
				}
			}
		}
	}

	async emitModerationEvent(uri, event, cid) {
		this.eventQueue.enqueue(async () => {
			if (!cid) {
				const res = await this.agent.app.bsky.feed.getPosts({ uris: [uri] })
				cid = res.data.posts[0].cid
			}
			if (!cid) return Promise.resolve()

			return this.agent.tools.ozone.moderation.emitEvent(
				{
					event: event,
					subject: {
						$type: "com.atproto.repo.strongRef",
						uri,
						cid: cid,
					},
					createdBy: this.agent.sessionManager.did,
					createdAt: new Date().toISOString(),
					subjectBlobCids: [],
				},
				{
					encoding: "application/json",
					headers: {
						"atproto-proxy": `${this.labelerDid}#atproto_labeler`,
					},
				}
			)
		})
	}

	async label(data, cid) {
		const event = {
			$type: "tools.ozone.moderation.defs#modEventLabel",
			createLabelVals: data.add,
			negateLabelVals: data.negate,
		}

		if (data.add.length || data.negate.length) {
			await this.emitModerationEvent(data.uri, event, cid)
		}
		await this.acknowledgeReport(data.uri, cid)
	}

	async acknowledgeReport(uri, cid) {
		const event = {
			$type: "tools.ozone.moderation.defs#modEventAcknowledge",
		}

		await this.emitModerationEvent(uri, event, cid)
	}

	async escalate(uri, cid) {
		const event = {
			$type: "tools.ozone.moderation.defs#modEventEscalate",
		}

		await this.emitModerationEvent(uri, event, cid)
	}

	async searchPosts(query, cursor) {
		const body = {
			q: query,
			limit: 100,
			sort: "recent",
		}
		if (cursor) body.cursor = cursor
		return this.agent.app.bsky.feed.searchPosts(body)
	}

	static fromSession(session, labelerDid) {
		return new ClientAPI(new Agent(session), labelerDid)
	}
	static bulkHydrateLimit = 25
	static maxRetries = 5
}

module.exports = ClientAPI
