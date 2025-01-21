const API = require("./API.cjs")
const ToyNoises = require("./sound/ToyNoises.cjs")
const InputControls = require("./InputControls.cjs")
const { randomIntFromInterval, chunkArray } = require("../utils.cjs")
const Hls = require("hls.js")

class PostQueue {
	constructor(api, toyNoises) {
		this.api = api
		this.toyNoises = toyNoises
		this.control = new InputControls(this)
		this.queue = []
		this.backQueue = []
		this.currentPost = null
		this.currentPosition = 0
		this.viewedAll = false
		this.currentVideoSubjectElement = null
		// populate labels
		this.labelElements = []
		this.api.getLabels().then(labels => {
			this.currentLabelsElement.innerHTML = ""
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

				this.currentLabelsElement.appendChild(inputElement)
				this.currentLabelsElement.appendChild(labelElement)
				this.labelElements.push(inputElement)
			})
			// populate queue
			this.getSet()
		})
		// elements
		this.currentSubjectElement = document.getElementById("currentSubject")
		this.subjectDisplayDiv = document.getElementById("subjectDisplay")
		this.currentLabelsElement = document.getElementById("currentLabels")
		this.positionIndicatorElement = document.getElementById("positionIndicator")
		this.placeholderImageUrl = this.currentSubjectElement.src
	}
	// Get the next set of posts
	getSet() {
		this.populateQueue().then(() => {
			if (this.queue[0]) {
				this.displayPost(this.queue[0])
			} else {
				alert(PostQueue.funnyEmptyQueueMessages[randomIntFromInterval(0, PostQueue.funnyEmptyQueueMessages.length - 1)])
			}
		}).catch((err) => {
			alert("Error while getting queue")
			console.error(err)
		})
	}
	preloadMedia(media) {
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
			this.subjectDisplayDiv.appendChild(video)
			media.videoCache = video
			media.hls = preloadHls
		}
	}

	async populateQueue() {
		const response = await this.api.getReports()
		const uris = response.map(report => report.subject.uri).filter(element => element)
		const promises = []
		chunkArray(uris, API.bulkHydrateLimit).forEach(postChunk => {
			const hydratePromise = this.api.hydratePosts(postChunk)
			promises.push(hydratePromise)
			hydratePromise.then(response => {
				const posts = response.posts
				const filteredPosts = PostQueue.filterTransformEmbedTypes(posts)
				filteredPosts.forEach(post => {
					this.queue.push(post)
				})
			})
		})
		Promise.allSettled(promises).then(() => {
			this.queue = this.queue.sort((a, b) => a.renderImages.length - b.renderImages.length)
				.sort((a, b) => b.likeCount - a.likeCount)
		})
		return Promise.allSettled(promises)
	}

	displayPost(post) {
		this.viewedAll = false
		this.currentPost = post
		this.currentPosition = 0
		this.switchPostImage()
		this.updateLabels(post)
	}

	updatePositionIndicator(post) {
		const text = `${this.currentPosition + 1}/${post.renderImages.length} - ${this.queue.length}`
		this.positionIndicatorElement.innerText = text
	}

	switchPostImage(direction = InputControls.DIRECTION.STILL) {
		if (!this.currentPost) return
		const max = this.currentPost.renderImages.length - 1
		const newPosition = this.currentPosition + direction
		this.currentPosition = Math.max(Math.min(newPosition, max), 0)
		if (this.currentPosition == max) {
			this.viewedAll = true
			this.toyNoises.playSound(ToyNoises.sounds.lastInPost)
		}
		if (this.currentVideoSubjectElement) {
			this.currentVideoSubjectElement.classList.add("hidden")
			this.currentVideoSubjectElement.pause()
			this.currentVideoSubjectElement = null
		}
		const media = this.currentPost.renderImages[this.currentPosition]
		if (media.playlist) {
			if (!media.videoCache) this.preloadMedia(media)
			const video = media.videoCache
			this.currentSubjectElement.classList.add("hidden")
			video.classList.remove("hidden")
			video.play()
			video.playbackRate = 2
			video.controls = true
			if (media.alt) {
				video.title = media.alt
				video.alt = media.alt
			}
			this.currentVideoSubjectElement = video
		} else {
			this.currentSubjectElement.classList.remove("hidden")
			this.currentSubjectElement.src = media.fullsize
			this.currentSubjectElement.title = media.alt
			this.currentSubjectElement.alt = media.alt
		}

		this.updatePositionIndicator(this.currentPost)
	}

	updateLabels(post) {
		this.labelElements.forEach(labelElement => {
			labelElement.checked = false
		})
		let hasLabel = false
		post.labels.forEach(label => {
			const labelElement = this.labelElements.find(element => element.id == label.val)
			if (labelElement) {
				labelElement.checked = true
				hasLabel = true
			}
		})
		if (hasLabel) this.toyNoises.playSound(ToyNoises.sounds.hasLabel)
	}

	static filterTransformEmbedTypes(posts) {
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
				if (post.embed.media["$type"] == "app.bsky.embed.video#view") {
					post.renderImages = [post.embed.media]
				}
			}
			if (type == "app.bsky.embed.video#view") {
				post.renderImages = [post.embed]
			}
		})
		return filteredPosts
	}

	static funnyEmptyQueueMessages = [
		"Incredible! You're a real bridge raiser!",
		"YOU'RE WINNER"
	]
	static backQueueLimit = 50
}

module.exports = PostQueue
