const ToyNoises = require("../sound/ToyNoises.cjs")
const InputControls = require("../InputControls.cjs")
const Hls = require("hls.js")

class SinglePostInterface {
	constructor(postQueue, toyNoises) {
		this.postQueue = postQueue
		this.configurationModal = postQueue.configurationModal
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
			this.next()
		})
		this.control.on("previous", () => {
			this.previous()
		})
	}
	displayPost(post) {
		this.viewedAll = false
		this.currentPost = post
		this.currentPosition = 0
		this.switchPostImage()
		this.updateLabels(post)
	}
	updatePositionIndicator(post) {
		const text = `${this.currentPosition + 1}/${post.renderImages.length} - ${this.postQueue.queue.length}`
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
	open() {
		this.postQueue.getSet()
	}
	previous() { // Gets one post from backQueue and displays it
		if (!this.currentPost) return
		if (!this.postQueue.backQueue.length) return
		const post = this.postQueue.backQueue.pop()
		this.postQueue.queue.unshift(post)
		this.displayPost(post)
	}
	next() { // Gets one post from queue and displays it
		if (!this.currentPost) return
		if (!this.viewedAll) return this.switchPostImage(InputControls.DIRECTION.RIGHT)
		const post = this.postQueue.queue.shift()
		this.postQueue.backQueue.push(post)
		if (this.postQueue.backQueue.length > parseInt(this.configurationModal.getSetting("backQueueLimit"))) {
			const removedPost = this.postQueue.backQueue.shift()
			if (removedPost.renderImages[0].videoCache) {
				removedPost.renderImages[0].videoCache.remove()
				// Destroy HLS context
				if (removedPost.renderImages[0].hls) {
					removedPost.renderImages[0].hls.destroy()
				}
			}
		}
		const postLabels = this.currentPost.labels
		const currentLabelValues = this.labelElements.map(element => { return { name: element.id, checked: element.checked } })
		const add = currentLabelValues.filter(currentValue => currentValue.checked == true && !postLabels.some(postLabel => postLabel.val == currentValue.name)).map(label => label.name)
		const negate = currentLabelValues.filter(currentValue => currentValue.checked == false && postLabels.some(postLabel => postLabel.val == currentValue.name)).map(label => label.name)
		this.postQueue.labelPost(post, add, negate)
		this.currentPost.labels = this.labelElements.filter(element => element.checked == true).map(element => { return { val: element.id } })
		if (this.postQueue.queue[0]) {
			this.displayPost(this.postQueue.queue[0])
			// preload next posts
			for (let i = 1; i < parseInt(this.configurationModal.getSetting("queuePreload")); i++) {
				if (this.postQueue.queue[i] && !this.postQueue.queue[i].preloaded) {
					this.postQueue.queue[i].preloaded = true
					this.postQueue.queue[i].renderImages.forEach(media => {
						this.preloadMedia(media)
					})
				}
			}
		} else {
			this.currentPost = null
			this.currentSubjectElement.src = this.placeholderImageUrl
			this.postQueue.getSet()
		}
	}
	displaySet() { // Displays the current post in queue
		this.displayPost(this.postQueue.queue[0])
	}
}

module.exports = SinglePostInterface
