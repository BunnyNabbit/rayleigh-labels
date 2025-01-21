const ToyNoises = require("../sound/ToyNoises.cjs")
const InputControls = require("../InputControls.cjs")
const Hls = require("hls.js")

class SinglePostInterface {
	constructor(postQueue, toyNoises) {
		this.postQueue = postQueue
		this.postQueue.interface = this
		this.toyNoises = toyNoises
		this.currentPosition = 0
		this.currentVideoSubjectElement = null
		// populate labels
		this.labelElements = []
		this.postQueue.api.getLabels().then(labels => {
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
		})
		// elements
		this.currentSubjectElement = document.getElementById("currentSubject")
		this.subjectDisplayDiv = document.getElementById("subjectDisplay")
		this.currentLabelsElement = document.getElementById("currentLabels")
		this.positionIndicatorElement = document.getElementById("positionIndicator")
		this.placeholderImageUrl = this.currentSubjectElement.src
		// controls
		this.control = new InputControls(postQueue)
		this.control.on("switchPostImage", (direction) => {
			this.switchPostImage(direction)
		})
		this.control.on("next", () => {
			this.postQueue.next()
		})
		this.control.on("previous", () => {
			this.postQueue.previous()
		})
	}
	displayPost(post) {
		this.postQueue.viewedAll = false
		this.postQueue.currentPost = post
		this.currentPosition = 0
		this.switchPostImage()
		this.updateLabels(post)
	}
	updatePositionIndicator(post) {
		const text = `${this.currentPosition + 1}/${post.renderImages.length} - ${this.postQueue.queue.length}`
		this.positionIndicatorElement.innerText = text
	}
	switchPostImage(direction = InputControls.DIRECTION.STILL) {
		if (!this.postQueue.currentPost) return
		const max = this.postQueue.currentPost.renderImages.length - 1
		const newPosition = this.currentPosition + direction
		this.currentPosition = Math.max(Math.min(newPosition, max), 0)
		if (this.currentPosition == max) {
			this.postQueue.viewedAll = true
			this.toyNoises.playSound(ToyNoises.sounds.lastInPost)
		}
		if (this.currentVideoSubjectElement) {
			this.currentVideoSubjectElement.classList.add("hidden")
			this.currentVideoSubjectElement.pause()
			this.currentVideoSubjectElement = null
		}
		const media = this.postQueue.currentPost.renderImages[this.currentPosition]
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

		this.updatePositionIndicator(this.postQueue.currentPost)
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
}

module.exports = SinglePostInterface
