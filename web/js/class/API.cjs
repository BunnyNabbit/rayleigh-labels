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
	getReports() {
		return fetch("/getreports").then(response => {
			if (!response.ok) {
				throw new Error("HTTP error " + response.status)
			}
			return response.json()
		}).then(json => {
			return json
		})
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
	getLabels() {
		return new Promise(resolve => {
			resolve(require("../../labels.json"))
		})
	}
	static bulkHydrateLimit = 25
}

module.exports = API
