const Hls = require("hls.js")

class GenericInterface {
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
		labels.forEach(label => {
			const inputElement = document.createElement('input')
			inputElement.type = 'checkbox'
			inputElement.id = label.slug

			const labelElement = document.createElement('label')
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
			const preloadHls = new Hls()
			preloadHls.loadSource(media.playlist)
			preloadHls.attachMedia(video)
			this.container.appendChild(video)
			media.videoCache = video
			media.hls = preloadHls
		}
		return media
	}
	close() {
		this.container.remove()
	}
}

module.exports = GenericInterface
