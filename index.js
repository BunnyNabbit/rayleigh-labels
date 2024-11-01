const express = require('express')
const { CredentialSession, Agent } = require("@atproto/api")
const app = express()
const port = 3213
app.use('/', express.static(require("path").join(__dirname, "static")))
class AgentP {
	constructor(handle, password, labelerDID) {
		this.session = new CredentialSession("https://bsky.social")
		this.agent = new Agent(this.session)
		this.ready = this.session.login({ identifier: handle, password }).then(() => {
			this.agent.addLabeler(labelerDID)
		})
		this.labelerDID = labelerDID
		// this.agent.api.tools.ozone.moderation.getEvents()
	}
	async label(label, uri) {
		const res = await this.agent.app.bsky.feed.getPosts({
			uris: [uri]
		})
		const promises = []
		res.data.posts.forEach(post => {
			if (!post.cid) return console.log("how wtf", uri)
			const cid = post.cid
			promises.push(this.agent.tools.ozone.moderation.emitEvent(
				{
					// specify the label event
					event: {
						$type: "tools.ozone.moderation.defs#modEventLabel",
						createLabelVals: [label],
						negateLabelVals: []
					},
					// specify the labeled post by strongRef
					subject: {
						$type: "com.atproto.repo.strongRef",
						uri,
						cid,
					},
					// put in the rest of the metadata
					createdBy: this.agent.session.did,
					createdAt: new Date().toISOString(),
					subjectBlobCids: [],
				},
				{
					encoding: "application/json",
					headers: {
						"atproto-proxy": `${this.agent.session.did}#atproto_labeler`,
					},
				}
			))
		})
		await Promise.all(promises)
	}
	queryStatuses() {
		return this.agent.tools.ozone.moderation.queryStatuses({
			limit: 100,
			includeMuted: true,
			sortField: "lastReportedAt",
			sortDirection: "desc",
			reviewState: "tools.ozone.moderation.defs#reviewOpen"
		}, {
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
	console.log(req.body.label)
	console.log(req.body.uri)
	const maxRetries = 5;
	for (let i = 0; i <= maxRetries; i++) {
		try {
			await labeler.label(req.body.label, req.body.uri)
			res.json({ message: "ok" })
			break // Successfully labeled, exit the loop
		} catch (error) {
			if (i === maxRetries) {
				console.error(`Failed to apply label after ${maxRetries} attempts:`, error)
				res.status(500).json({ message: "Failed to apply label" })
			} else {
				console.warn(`Attempt ${i + 1} failed, retrying...`)
				await new Promise(resolve => setTimeout(resolve, 1000))
			}
		}
	}
})

const maxRetries = 5

app.post('/hydrateposts', async (req, res) => {
	await agent.ready
	for (let i = 0; i <= maxRetries; i++) {
		try {
			console.log(req.body)
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
	for (let i = 0; i <= maxRetries; i++) {
		try {
			const reports = await agent.queryStatuses()
			res.json(reports)
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

const agentKey = require("./agentKeys.json")
const agent = new AgentP(agentKey.handle, agentKey.password, agentKey.labelerDID)

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})