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
class ToyNoises {
	constructor() {
		this.sfxrGenerationDegradation = 0
		this.interval = setInterval(() => { this.sfxrGenerationDegradation = 1 }, 300)
	}
	playSound(sfxrPayload) {
		if (!SoundEffect) return
		this.sfxrGenerationDegradation += 0.1
		let audio = new SoundEffect(sfxrPayload).parameters.mutate()
		audio.sound_vol = (0.04 / this.sfxrGenerationDegradation) * 1.5
		audio.sample_rate = Math.round((44100 / this.sfxrGenerationDegradation) * 1)
		audio = new SoundEffect(audio).generate().getAudio()
		audio.play()
	}
	destroy() {
		clearInterval()
	}
	static sounds = {
		lastInPost: "11111GvZH7jwT4FjsvL4Kt7D9TBj81nTkcvBs3VbcAfsTdCKdtFu6AmMN5iKGM55Y4cPxiz6SG7etbWKP2QkiVwBfo54smV8s9t7v37V7MT1vDs7CEjwSjSf",
		hasLabel: "3Yw2CxDjPUsnbj3nAaw1boqFv8ordh7fvnYwRtUhUouLzXFrNBA8YeybkVQCnjpiXefXnmDMmdgzarbnuxdhmnXrNsnd99tdHiHZYYEAoFANNHyhiycwYCX8B",
		addLabel: "34T6PktTUDAmJbCDoG4ZpNfWdzxkh2X7RQJBpEtRydQ6V21jpTtsGMGu4qDVioCHUeayPmzGf2HVzxQkUZkg5wpjHFJAWahbhYfaq9DefuN7uRYXsKmbcNWrT",
		removeLabel: "34T6PktTUDAmJbCDoG4ZpNf1dUxfN4tkxPxnYkKQZWzNxssWrEzepcSwfgvdcdKmxF1a2EnN5C5RHHCviY45PniXkeZJTFbLfuZe8f4ohaAfVyoEpk5deUYEj",
		videoLoad: "57uBnWWjHLipzPva3aWuvVAKjtNZVqPXK1rgnULF75gk39WvWUNqpZbnQmQj3NPQwkcUQ6VQkHGpYb4s6vJvXNX27gzA9ibekarmFqKXYQfmhKQuffiEidF35"
	}
}
const toyNoises = new ToyNoises()

const currentSubjectElement = document.getElementById("currentSubject")
const subjectDisplayDiv = document.getElementById("subjectDisplay")
const hls = new Hls()
const currentLabelsElement = document.getElementById("currentLabels")
const positionIndicatorElement = document.getElementById("positionIndicator")
const placeholderImageUrl = currentSubjectElement.src

function preloadMedia(media) {
	if (media.fullsize) {
		const preloadImage = new Image()
		preloadImage.src = media.fullsize
	}
	if (media.playlist) {
		const video = document.createElement("video")
		video.classList.add("hidden")
		video.autoplay = false
		video.loop = true
		video.muted = true
		video.classList.add("fullscreen-image")
		const preloadHls = new Hls()
		preloadHls.loadSource(media.playlist)
		preloadHls.attachMedia(video)
		subjectDisplayDiv.appendChild(video)
		media.videoCache = video
	}
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
	const supportedTypes = ["app.bsky.embed.images#view", "app.bsky.embed.recordWithMedia#view", "app.bsky.embed.video#view"]
	console.log("posts", posts)
	const filteredPosts = posts.filter(post => {
		return post.embed && supportedTypes.includes(post.embed["$type"])
	})
	filteredPosts.forEach(post => {
		console.log(post)
		const type = post.embed["$type"]
		if (type == "app.bsky.embed.images#view") {
			post.renderImages = post.embed.images
		}
		if (type == "app.bsky.embed.recordWithMedia#view") {
			if (post.embed.media["$type"] == "app.bsky.embed.images#view") {
				post.renderImages = post.embed.media.images
			}
		}
		if (type == "app.bsky.embed.video#view") {
			post.renderImages = [post.embed]
		}
	})
	return filteredPosts
}

async function populateQueue() {
	const response = await api.getReports()
	const uris = response.map(report => report.subject.uri).filter(element => element)
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
	Promise.allSettled(promises).then(() => {
		queue = queue.sort((a, b) => a.renderImages.length - b.renderImages.length)
			.sort((a, b) => b.likeCount - a.likeCount)
	})
	return Promise.allSettled(promises)
}

let queue = []
let currentPost = null
let currentPosition = 0
let viewedAll = false
function displayPost(post) {
	viewedAll = false
	currentPost = post
	currentPosition = 0
	switchPostImage()
	updateLabels(post)
}

function updatePositionIndicator(post) {
	const text = `${currentPosition + 1}/${post.renderImages.length} - ${queue.length}`
	positionIndicatorElement.innerText = text
}

let currentVideoSubjectElement = null
function switchPostImage(direction = DIRECTION.STILL) {
	if (!currentPost) return
	const max = currentPost.renderImages.length - 1
	const newPosition = currentPosition + direction
	currentPosition = Math.max(Math.min(newPosition, max), 0)
	if (currentPosition == max) {
		viewedAll = true
		toyNoises.playSound(ToyNoises.sounds.lastInPost)
	}
	if (currentVideoSubjectElement) {
		currentVideoSubjectElement.classList.add("hidden")
		currentVideoSubjectElement.pause()
		currentVideoSubjectElement = null
	}
	const media = currentPost.renderImages[currentPosition]
	if (media.playlist) {
		if (!media.videoCache) preloadMedia(media)
		const video = media.videoCache
		currentSubjectElement.classList.add("hidden")
		video.classList.remove("hidden")
		video.play()
		if (media.alt) {
			video.title = media.alt
			video.alt = media.alt
		}
		currentVideoSubjectElement = video
	} else {
		currentSubjectElement.classList.remove("hidden")
		currentSubjectElement.src = media.fullsize
		currentSubjectElement.title = media.alt
		currentSubjectElement.alt = media.alt
	}

	updatePositionIndicator(currentPost)
}

function updateLabels(post) {
	labelElements.forEach(labelElement => {
		labelElement.checked = false
	})
	let hasLabel = false
	post.labels.forEach(label => {
		const labelElement = labelElements.find(element => element.id == label.val)
		if (labelElement) {
			labelElement.checked = true
			hasLabel = true
		}
	})
	if (hasLabel) toyNoises.playSound(ToyNoises.sounds.hasLabel)
}

class Control {
	constructor() {
		document.addEventListener('keydown', (event) => {
			if (event.key == "ArrowLeft") {
				this.switchLeft()
			}
			if (event.key == "ArrowRight") {
				this.switchRight()
			}
			if (event.key == "Enter") {
				this.next()
			}
			if (event.key == "Backspace") {
				this.previous()
			}
		})
		let touchStartX = null
		let touchStartY = null
		const threshold = 50
		document.addEventListener('touchstart', (event) => {
			touchStartX = event.touches[0].clientX
			touchStartY = event.touches[0].clientY
		})
		document.addEventListener('touchend', (event) => {
			if (!touchStartX || !touchStartY) return
			const touchEndX = event.changedTouches[0].clientX
			const touchEndY = event.changedTouches[0].clientY
			const deltaX = touchEndX - touchStartX
			const deltaY = touchEndY - touchStartY
			if (Math.abs(deltaX) > threshold && Math.abs(deltaY) < threshold) {
				if (deltaX > 0) {
					this.switchRight()
				} else {
					this.switchLeft()
				}
			}
			if (Math.abs(deltaY) > threshold && Math.abs(deltaX) < threshold) {
				if (deltaY < 0) {
					this.next()
				} else {
					this.previous()
				}
			}
			touchStartX = null
			touchStartY = null
		})
		this.backQueue = []
	}
	switchLeft() {
		switchPostImage(DIRECTION.LEFT)
	}
	switchRight() {
		switchPostImage(DIRECTION.RIGHT)
	}
	next() {
		if (!currentPost) return
		if (!viewedAll) return switchPostImage(DIRECTION.RIGHT)
		const post = queue.shift()
		this.backQueue.push(post)
		if (this.backQueue.length > Control.backQueueLimit) {
			const removedPost = this.backQueue.shift()
			if (removedPost.renderImages[0].videoCache) removedPost.renderImages[0].videoCache.remove()
		}
		const postLabels = currentPost.labels
		const currentLabelValues = labelElements.map(element => { return { name: element.id, checked: element.checked } })
		const add = currentLabelValues.filter(currentValue => currentValue.checked == true && !postLabels.some(postLabel => postLabel.val == currentValue.name)).map(label => label.name)
		const negate = currentLabelValues.filter(currentValue => currentValue.checked == false && postLabels.some(postLabel => postLabel.val == currentValue.name)).map(label => label.name)
		api.label({
			add, negate, uri: currentPost.uri
		})
		currentPost.labels = labelElements.filter(element => element.checked == true).map(element => { return { val: element.id } })
		if (queue[0]) {
			displayPost(queue[0])
			// preload next posts
			for (let i = 1; i < 6; i++) {
				if (queue[i] && !queue[i].preloaded) {
					queue[i].preloaded = true
					queue[i].renderImages.forEach(media => {
						preloadMedia(media)
					})
				}
			}
		} else {
			currentPost = null
			currentSubjectElement.src = placeholderImageUrl
			getSet()
		}
	}
	previous() {
		if (!currentPost) return
		if (!this.backQueue.length) return
		const post = this.backQueue.pop()
		queue.unshift(post)
		displayPost(post)
	}
	static backQueueLimit = 50
}

new Control()

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