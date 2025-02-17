class API {
	constructor() {
	}
	async hydratePosts(uris) {
		const response = await fetch("/hydrateposts", {
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			method: "POST",
			body: JSON.stringify({ uris })
		})
		if (!response.ok) {
			throw new Error("HTTP error " + response.status)
		}
		return await response.json()
	}
	async getReports(queue) {
		const response = await fetch(`/getreports/${queue}`)
		if (!response.ok) {
			throw new Error("HTTP error " + response.status)
		}
		const json = await response.json()
		return json
	}
	async label(data) {
		const response = await fetch("/addlabel", {
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			method: "POST",
			body: JSON.stringify(data)
		})
		if (!response.ok) {
			throw new Error("HTTP error " + response.status)
		}
		return await response.json()
	}
	async escalate(uri) {
		const response = await fetch("/escalate", {
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			method: "POST",
			body: JSON.stringify({ uri })
		})
		if (!response.ok) {
			throw new Error("HTTP error " + response.status)
		}
		return await response.json()
	}
	getLabels() {
		return new Promise(resolve => {
			resolve(require("../../labels.json"))
		})
	}
	static bulkHydrateLimit = 25
}

module.exports = API
