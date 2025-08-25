const ToyNoises = require("../sound/ToyNoises.cjs")
const InputControls = require("../InputControls.cjs")
const GenericInterface = require("./GenericInterface.cjs")

class SinglePostInterface extends GenericInterface {
	constructor(postQueue, toyNoises) {
		super(postQueue, toyNoises, true)
		this.postQueue = postQueue
		this.configurationModal = postQueue.configurationModal
		this.postQueue.interface = this
		this.toyNoises = toyNoises
		this.currentPosition = 0
		this.currentVideoSubjectElement = null
		this.currentSubjectElement = null
		// populate labels
		this.labelElements = []
		const labels = this.postQueue.getLabels()
		this.currentLabelsElement = document.getElementById("currentLabels")
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
		// elements
		this.subjectDisplayDiv = document.getElementById("subjectDisplay")
		this.positionIndicatorElement = document.getElementById("positionIndicator")
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
		if (this.currentSubjectElement) {
			this.currentSubjectElement.classList.add("hidden")
			this.currentSubjectElement = null
		}
		const media = this.currentPost.renderImages[this.currentPosition]
		if (media.playlist) {
			if (!media.elementCache) this.preloadMedia(media)
			media.elementCache.classList.add("fullscreen-image")
			const video = media.elementCache
			video.classList.remove("hidden")
			video.play()
			video.playbackRate = 2
			video.controls = true
			if (media.alt) {
				video.title = media.alt
				video.alt = media.alt
			}
			this.currentVideoSubjectElement = video
			const timeIncrement = this.configurationModal.getSetting("videoSeekSeconds") // seconds
			if (direction == InputControls.DIRECTION.RIGHT) { // seek video
				video.currentTime = Math.min(video.currentTime + timeIncrement, video.duration)
			} else if (direction == InputControls.DIRECTION.LEFT) {
				video.currentTime = Math.max(video.currentTime - timeIncrement, 0)
			}

		} else {
			if (!media.elementCache) this.preloadMedia(media)
			const image = media.elementCache
			image.classList.remove("hidden")
			image.classList.add("fullscreen-image")
			image.title = media.alt
			image.alt = media.alt
			this.currentSubjectElement = image
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
	open() {
		document.getElementById("singlePostInterface").classList.remove("hidden")
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
			removedPost.renderImages.forEach(media => {
				if (media.elementCache) {
					media.elementCache.remove()
					// Destroy HLS context
					if (media.hls) {
						media.hls.destroy()
					}
				}
			})
		}
		const postLabels = this.currentPost.labels
		const currentLabelValues = this.labelElements.map(element => { return { name: element.id, checked: element.checked } })
		const add = currentLabelValues.filter(currentValue => currentValue.checked == true && !postLabels.some(postLabel => postLabel.val == currentValue.name)).map(label => label.name)
		const negate = currentLabelValues.filter(currentValue => currentValue.checked == false && postLabels.some(postLabel => postLabel.val == currentValue.name)).map(label => label.name)
		this.postQueue.labelPost(post, add, negate)
		this.currentPost.labels = this.labelElements.filter(element => element.checked == true).map(element => { return { val: element.id } })
		if (this.postQueue.queue[0]) {
			this.displayPost(this.postQueue.queue[0])
			this.preloadNextPosts()
		} else {
			this.currentPost = null
			this.postQueue.getSet()
		}
	}
	displaySet() { // Displays the current post in queue
		this.displayPost(this.postQueue.queue[0])
	}
}

module.exports = SinglePostInterface
