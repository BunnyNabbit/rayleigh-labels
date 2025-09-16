const Hls = require("hls.js")

class GenericInterface {
	/** */
	constructor(postQueue, toyNoises, disableLabels) {
		this.postQueue = postQueue
		this.configurationModal = postQueue.configurationModal
		this.postQueue.interface = this
		this.toyNoises = toyNoises
		// elements
		this.container = document.createElement("div")
		document.body.appendChild(this.container)
		this.addPositionIndicator()
		// populate labels
		if (!disableLabels) {
			this.currentLabelsElement = document.createElement("div")
			this.container.appendChild(this.currentLabelsElement)
			this.addLabelElements()
		}
	}

	addPositionIndicator() {
		this.positionIndicatorElement = document.createElement("div")
		this.positionIndicatorElement.classList.add("position-indicator")
		this.positionIndicatorElement.classList.add("font")
		this.container.appendChild(this.positionIndicatorElement)
	}

	addLabelElements() {
		this.labelElements = []
		const labels = this.postQueue.getLabels()
		this.currentLabelsElement.innerHTML = ""
		labels.forEach((label) => {
			const inputElement = document.createElement("input")
			inputElement.type = "checkbox"
			inputElement.id = label.slug

			const labelElement = document.createElement("label")
			labelElement.htmlFor = label.slug
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
	}

	preloadNextPosts() {
		// preload next posts
		let imagesPreloaded = 0
		for (let i = 1; i < this.postQueue.queue.length; i++) {
			const post = this.postQueue.queue[i]
			if (!post.renderImages[0].playlist) {
				imagesPreloaded++
				if (imagesPreloaded == parseInt(this.configurationModal.getSetting("queuePreload"))) {
					break
				}
				if (post.preloaded) {
					continue
				}
				post.preloaded = true
				post.renderImages.forEach((media) => {
					this.preloadMedia(media)
				})
			}
		}
		// videos
		let videosPreloaded = 0
		for (let i = 1; i < this.postQueue.queue.length; i++) {
			const post = this.postQueue.queue[i]
			if (post.renderImages[0].playlist) {
				videosPreloaded++
				if (videosPreloaded == parseInt(this.configurationModal.getSetting("videoPreload"))) {
					break
				}
				if (post.preloaded) {
					continue
				}
				post.preloaded = true
				post.renderImages.forEach((media) => {
					this.preloadMedia(media)
				})
			}
		}
	}

	preloadMedia(media) {
		media.loaded = false
		if (media.fullsize) {
			const img = document.createElement("img")
			img.src = media.fullsize
			img.classList.add("hidden")
			media.elementCache = img
			this.container.appendChild(img)
			img.onload = () => {
				media.loaded = true
				console.log("loaded image")
			}
		}
		if (media.playlist) {
			const video = document.createElement("video")
			video.classList.add("hidden")
			video.autoplay = false
			video.loop = true
			video.muted = true
			const preloadHls = new Hls()
			preloadHls.loadSource(media.playlist)
			preloadHls.attachMedia(video)
			this.container.appendChild(video)
			media.elementCache = video
			media.hls = preloadHls
			video.onloadeddata = () => {
				media.loaded = true
				console.log("loaded video")
			}
		}
		return media
	}

	close() {
		this.container.remove()
	}
}

module.exports = GenericInterface
