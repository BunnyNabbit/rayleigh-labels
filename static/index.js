class API {
	constructor() {
	}
	hydratePosts(uris) {
		return fetch("/hydrateposts", {
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
		return fetch("/getreports").then(response => {
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
	static bulkHydrateLimit = 25
}

const currentSubjectElement = document.getElementById("currentSubject")
const currentLabelsElement = document.getElementById("currentLabels")
const positionIndicatorElement = document.getElementById("positionIndicator")

function preloadImage(url) {
	const preloadImage = new Image()
	preloadImage.src = url
}

const api = new API()

function chunkArray(array, number) {
	const chunks = []
	let chunk = []
	array.forEach(element => {
		chunk.push(element)
		if (chunk.length == number) {
			chunks.push(chunk)
			chunk = []
		}
	})
	if (chunk.length) chunks.push(chunk)
	return chunks
}

function filterTransformEmbedTypes(posts) {
	// TODO: support "app.bsky.embed.recordWithMedia#view"
	const supportedTypes = ["app.bsky.embed.images#view"]
	console.log("posts", posts)
	const filteredPosts = posts.filter(post => {
		return post.embed && supportedTypes.includes(post.embed["$type"])
	})
	filteredPosts.forEach(post => {
		console.log(post)
		if (post.embed["$type"] == "app.bsky.embed.images#view") {
			post.renderImages = post.embed.images
		}
		post.renderImages.forEach(media => {
			setTimeout(() => {
				preloadImage(media.fullsize)
			}, 60000 * Math.random())
		})
	})
	return filteredPosts
}

// populate queue
const queue = []
api.getReports().then(response => {
	const uris = response.data.subjectStatuses.map(report => report.subject.uri)
	chunkArray(uris, API.bulkHydrateLimit).forEach(postChunk => {
		api.hydratePosts(postChunk).then(response => {
			const posts = response.posts
			console.log(filterTransformEmbedTypes(posts))
		})
	})
})