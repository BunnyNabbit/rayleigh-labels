class API {
	constructor() {
	}
	hydratePosts(uris) {
		fetch("/hydrateposts", {
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			method: "POST",
			body: JSON.stringify({ uris })
		}).then(function (response) {
			if (!response.ok) {
				throw new Error("HTTP error " + response.status);
			}
			return response.json()
		})
	}
	getReports() {
		fetch("/getreports").then(response => {
			if (!response.ok) {
				throw new Error("HTTP error " + response.status);
			}
			return response.json()
		}).then(json => {
			return json
		})
	}
	label(uri, apply = true, values = []) {
		fetch()
	}
}

const api = new API()