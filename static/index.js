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
	label(data) {
		return fetch("/addlabel", {
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			method: "POST",
			body: JSON.stringify(data)
		}).then(function (response) {
			if (!response.ok) {
				throw new Error("HTTP error " + response.status);
			}
			return response.json()
		})
	}
	getLabels() {
		return fetch("/labels.json").then(response => {
			if (!response.ok) {
				throw new Error("HTTP error " + response.status);
			}
			return response.json()
		}).then(json => {
			return json
		})
	}
	static bulkHydrateLimit = 25
}

const DIRECTION = {
	LEFT: -1,
	RIGHT: 1,
	STILL: 0
}

const currentSubjectElement = document.getElementById("currentSubject")
const currentLabelsElement = document.getElementById("currentLabels")
const positionIndicatorElement = document.getElementById("positionIndicator")
const placeholderImageUrl = currentSubjectElement.src

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

async function populateQueue() {
	const response = await api.getReports()
	const uris = response.data.subjectStatuses.map(report => report.subject.uri).filter(element => element)
	const promises = []
	chunkArray(uris, API.bulkHydrateLimit).forEach(postChunk => {
		const hydratePromise = api.hydratePosts(postChunk)
		promises.push(hydratePromise)
		hydratePromise.then(response => {
			const posts = response.posts
			const filteredPosts = filterTransformEmbedTypes(posts)
			filteredPosts.forEach(post => {
				queue.push(post)
			})
		})
	})
	return Promise.allSettled(promises)
}

const queue = []
let currentPost = null
let currentPosition = 0
function displayPost(post) {
	currentPost = post
	currentPosition = 0
	switchPostImage()
	updateLabels(post)
}

function updatePositionIndicator(post) {
	const text = `${currentPosition + 1}/${post.renderImages.length}`
	positionIndicatorElement.innerText = text
}

function switchPostImage(direction = DIRECTION.STILL) {
	if (!currentPost) return
	const max = currentPost.renderImages.length
	const newPosition = currentPosition + direction
	currentPosition = Math.max(Math.min(newPosition, max), 0)
	const media = currentPost.renderImages[currentPosition]
	currentSubjectElement.src = media.fullsize
	currentSubjectElement.title = media.alt
	currentSubjectElement.alt = media.alt
	updatePositionIndicator(currentPost)
}

function updateLabels(post) {
	labelElements.forEach(labelElement => {
		labelElement.checked = false
	})
	post.labels.forEach(label => {
		const labelElement = labelElements.find(element => element.id == label.val)
		if (labelElement) labelElement.checked = true
	})
}

document.addEventListener('keydown', function (event) {
	if (event.key == "ArrowLeft") {
		switchPostImage(DIRECTION.LEFT)
	}
	if (event.key == "ArrowRight") {
		switchPostImage(DIRECTION.RIGHT)
	}
	if (event.key == "Enter") {
		if (!currentPost) return
		queue.shift()
		const postLabels = currentPost.labels.filter(label => label.neg != true) // i forget if zhe appview hydrates negated labels or not. doing zhis just in case.
		const currentLabelValues = labelElements.map(element => { return { name: element.id, checked: element.checked } })
		const add = currentLabelValues.filter(currentValue => currentValue.checked == true && !postLabels.some(postLabel => postLabel.val == currentValue.name)).map(label => label.name)
		const negate = currentLabelValues.filter(currentValue => currentValue.checked == false && postLabels.some(postLabel => postLabel.val == currentValue.name)).map(label => label.name)
		api.label({
			add, negate, uri: currentPost.uri
		})
		if (queue[0]) {
			displayPost(queue[0])
		} else {
			currentPost = null
			currentSubjectElement.src = placeholderImageUrl
			getSet()
		}
	}
})

const funnyEmptyQueueMessages = [
	"Incredible! You're a real bridge raiser!",
	"YOU'RE WINNER"
]

function randomIntFromInterval(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

let labelElements = []
// populate labels
api.getLabels().then(labels => {
	currentLabelsElement.innerHTML = ""
	labels.forEach(label => {
		const inputElement = document.createElement('input')
		inputElement.type = 'checkbox'
		inputElement.id = label.value

		const labelElement = document.createElement('label')
		labelElement.htmlFor = label.value
		labelElement.textContent = label.readableName
		labelElement.style.backgroundColor = label.backgroundColor
		labelElement.style.color = label.textColor

		// Optional: Add alt key functionality
		if (label.altKey) {
			inputElement.accessKey = label.altKey // Use accessKey for alt key
			labelElement.title = `Alt+${label.altKey}` // Add tooltip for accessibility
		}

		currentLabelsElement.appendChild(inputElement)
		currentLabelsElement.appendChild(labelElement)
		labelElements.push(inputElement)
	})
	// populate queue
	getSet()
})

function getSet() {
	populateQueue().then(() => {
		if (queue[0]) {
			displayPost(queue[0])
		} else {
			alert(funnyEmptyQueueMessages[randomIntFromInterval(0, funnyEmptyQueueMessages.length - 1)])
		}
	}).catch((err) => {
		alert("Error while getting queue")
		console.error(err)
	})
}