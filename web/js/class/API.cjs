const { Agent } = require('@atproto/api')

class ClientAPI {
	/**
	 * @param {Agent} agent  
	 * @param {string} labelerDid
	 */
	constructor(agent, labelerDid) {
		this.agent = agent
		this.labelerDid = labelerDid
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
					await new Promise(resolve => setTimeout(resolve, 1000))
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
			reviewState: queue
		}
		if (cursor) body.cursor = cursor
		return this.agent.tools.ozone.moderation.queryStatuses(body, {
			encoding: "application/json",
			headers: {
				"atproto-proxy": `${this.labelerDid}#atproto_labeler`
			}
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
					await new Promise(resolve => setTimeout(resolve, 1000))
				}
			}
		}
	}
	async emitModerationEvent(uri, event) {
		const res = await this.agent.app.bsky.feed.getPosts({ uris: [uri] })
		const promises = res.data.posts.map(post => {
			if (!post.cid) return Promise.resolve()

			return this.agent.tools.ozone.moderation.emitEvent(
				{
					event: event,
					subject: {
						$type: "com.atproto.repo.strongRef",
						uri,
						cid: post.cid,
					},
					createdBy: this.agent.sessionManager.did,
					createdAt: new Date().toISOString(),
					subjectBlobCids: [],
				},
				{
					encoding: "application/json",
					headers: {
						"atproto-proxy": `${this.labelerDid}#atproto_labeler`
					}
				}
			)
		})
		await Promise.all(promises)
	}
	async label(data) {
		const event = {
			$type: "tools.ozone.moderation.defs#modEventLabel",
			createLabelVals: data.add,
			negateLabelVals: data.negate,
		}

		if (data.add.length || data.negate.length) {
			await this.emitModerationEvent(data.uri, event)
		}
		await this.acknowledgeReport(data.uri)
	}
	async acknowledgeReport(uri) {
		const event = {
			$type: "tools.ozone.moderation.defs#modEventAcknowledge",
		}

		await this.emitModerationEvent(uri, event)
	}
	async escalate(uri) {
		const event = {
			$type: "tools.ozone.moderation.defs#modEventEscalate",
		}

		await this.emitModerationEvent(uri, event)
	}
	static fromSession(session, labelerDid) {
		return new ClientAPI(new Agent(session), labelerDid)
	}
	static bulkHydrateLimit = 25
	static maxRetries = 5
}

module.exports = ClientAPI
