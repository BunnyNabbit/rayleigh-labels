const express = require('express')
const { CredentialSession, Agent } = require("@atproto/api")
const app = express()
const port = 3213
app.use('/', express.static(require("path").join(__dirname, "web")))
class AgentP {
	constructor(handle, password, labelerDID) {
		this.session = new CredentialSession("https://bsky.social")
		this.agent = new Agent(this.session)
		this.ready = this.session.login({ identifier: handle, password }).then(() => {
			this.agent.addLabeler(labelerDID)
		})
		this.labelerDID = labelerDID
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
						"atproto-proxy": `${this.labelerDID}#atproto_labeler`,
					},
				}
			)
		})
		await Promise.all(promises)
	}

	async label(addLabels, negateLabels, uri) {
		const event = {
			$type: "tools.ozone.moderation.defs#modEventLabel",
			createLabelVals: addLabels,
			negateLabelVals: negateLabels,
		}

		await this.emitModerationEvent(uri, event)
	}

	async acknowledgeReport(uri) {
		const event = {
			$type: "tools.ozone.moderation.defs#modEventAcknowledge",
		}

		await this.emitModerationEvent(uri, event)
	}
	queryStatuses(cursor) {
		const body = {
			limit: 100,
			includeMuted: true,
			sortField: "lastReportedAt",
			sortDirection: "desc",
			reviewState: "tools.ozone.moderation.defs#reviewOpen"
		}
		if (cursor) body.cursor = cursor
		return this.agent.tools.ozone.moderation.queryStatuses(body, {
			encoding: "application/json",
			headers: {
				"atproto-proxy": `${this.labelerDID}#atproto_labeler`,
			},
		})
	}
	hydratePosts(uris) {
		return this.agent.getPosts({
			uris
		})
	}
}

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*")
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	next()
})

app.post('/addlabel/', async (req, res) => {
	await agent.ready
	for (let i = 0; i <= maxRetries; i++) {
		try {
			if (req.body.add.length || req.body.negate.length) {
				await agent.label(req.body.add, req.body.negate, req.body.uri)
			}
			res.json({ message: "ok" })
			break // Successfully labeled, exit the loop
		} catch (error) {
			if (i === maxRetries) {
				console.error(`Failed to apply label after ${maxRetries} attempts:`, error)
				res.status(500).json({ message: "Failed to apply label" })
				return
			} else {
				console.warn(`Attempt ${i + 1} failed, retrying...`)
				await new Promise(resolve => setTimeout(resolve, 1000))
			}
		}
	}
	for (let i = 0; i <= maxRetries; i++) {
		try {
			await agent.acknowledgeReport(req.body.uri)
			break
		} catch (error) {
			console.error("Failed to acknowledge", error)
		}
	}
})

const maxRetries = 5
const queuePages = 30

app.post('/hydrateposts', async (req, res) => {
	await agent.ready
	for (let i = 0; i <= maxRetries; i++) {
		try {
			const response = await agent.hydratePosts(req.body.uris)
			res.json(response.data)
			break
		} catch (error) {
			if (i === maxRetries) {
				console.error(error)
				res.status(500).json({ message: "Failed" })
			} else {
				console.warn(`Attempt ${i + 1} failed, retrying...`)
				await new Promise(resolve => setTimeout(resolve, 1000))
			}
		}
	}

})

app.get('/getreports/', async (req, res) => {
	await agent.ready
	let reports = []
	function respond() {
		res.json(reports)
	}
	function fail() {
		res.status(500).json({ message: "Failed" })
	}
	let cursor = null
	for (let i = 0; i <= queuePages; i++) {
		try {
			const statusResponse = await agent.queryStatuses(cursor)
			cursor = statusResponse.data.cursor
			reports = reports.concat(statusResponse.data.subjectStatuses)
			if (cursor) {
				if (i == queuePages) {
					respond()
					break
				}
				continue
			} else {
				respond()
				break
			}
		} catch (error) {
			if (i === queuePages) {
				console.error(error)
				if (reports.length) {
					respond()
				} else {
					fail()
				}
			} else {
				console.warn(`Attempt ${i + 1} failed, retrying...`)
				await new Promise(resolve => setTimeout(resolve, 1000))
			}
		}
	}
})

const agentKey = require("./agentKeys.json")
const agent = new AgentP(agentKey.handle, agentKey.password, agentKey.labelerDID)

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})