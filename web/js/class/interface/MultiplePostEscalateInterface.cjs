// const ToyNoises = require("../sound/ToyNoises.cjs")
const InputControls = require("../InputControls.cjs")
const GenericInterface = require("./GenericInterface.cjs")

// Displays media from posts in a grid. Click to escalate a post, removing it from queue and view.
class MultiplePostEscalateInterface extends GenericInterface {
	constructor(postQueue, toyNoises) {
		super(postQueue, toyNoises, true)
		this.overflowPost = null
		this.overflowMedia = []
		this.currentPosts = []
		// controls
		this.control = new InputControls(postQueue)
		this.control.on("next", () => {
			this.next()
		})
		this.control.on("previous", () => {
			this.previous()
		})
		this.container.style.gap = "1px"
		this.container.style.display = "grid"
		this.container.style.height = "100vh"
		this.container.style.width = "100vw"
		this.labelValues = new Set()
		this.postQueue.api.getLabels().then(labels => {
			labels.forEach(label => {
				this.labelValues.add(label.value)
			})
		})
	}
	updatePositionIndicator() {
		const text = `${this.postQueue.queue.length}`
		this.positionIndicatorElement.innerText = text
	}
	open() {
		this.gridX = parseInt(this.configurationModal.getSetting("gridX"))
		this.gridY = parseInt(this.configurationModal.getSetting("gridY"))
		this.setCount = this.gridX * this.gridY
		this.container.style.gridTemplateColumns = `repeat(${this.gridX}, 1fr)`
		this.container.style.gridTemplateRows = `repeat(${this.gridY}, 1fr)`
		this.postQueue.getSet()
	}
	previous() { // Gets posts from backQueue and displays them
		if (!this.postQueue.backQueue.length) return
		// move current posts to queue
		this.postQueue.queue.unshift(...this.currentPosts)
		// display posts from back queue
		this.displayPosts(this.postQueue.backQueue)
		// remove current posts from back queue
		let remove = []
		for (const post of this.postQueue.backQueue) {
			if (this.currentPosts.includes(post)) {
				remove.push(post)
			}
		}
		remove.forEach(post => {
			this.postQueue.backQueue.splice(this.postQueue.backQueue.indexOf(post), 1)
		})
	}
	next() { // Gets posts from queue and displays them
		if (this.postQueue.queue[0]) {
			this.postQueue.backQueue.unshift(...this.currentPosts) // add current posts to back queue
			// acknowledge current posts which have not been escalated
			this.currentPosts.forEach(post => {
				if (!post.escalated && !post.acknowledged) {
					this.postQueue.labelPost(post, [], [])
					post.acknowledged = true
				}
			})
			this.displaySet()
			// preload next posts
			for (let i = 1; i < parseInt(this.configurationModal.getSetting("queuePreload")); i++) {
				if (this.postQueue.queue[i] && !this.postQueue.queue[i].preloaded) {
					this.postQueue.queue[i].preloaded = true
					this.postQueue.queue[i].renderImages.forEach(media => {
						this.preloadMedia(media)
					})
				}
			}
			// trim back queue
			const backQueueLimit = parseInt(this.configurationModal.getSetting("backQueueLimit"))
			if (this.postQueue.backQueue.length > backQueueLimit) {
				const removed = this.postQueue.backQueue.splice(backQueueLimit)
				removed.forEach(removedPost => {
					if (removedPost.renderImages[0].videoCache) {
						removedPost.renderImages[0].videoCache.remove()
						// Destroy HLS context
						if (removedPost.renderImages[0].hls) {
							removedPost.renderImages[0].hls.destroy()
						}
					}
				})
			}
			// remove current posts from queue
			let remove = []
			for (const post of this.postQueue.queue) {
				if (this.currentPosts.includes(post)) {
					remove.push(post)
				}
			}
			remove.forEach(post => {
				this.postQueue.queue.splice(this.postQueue.queue.indexOf(post), 1)
			})
		} else {
			this.displaySet() // TODO: loading placeholder. i'll call displaySet since it'll display black for zhe time being
			this.postQueue.getSet()
		}
	}
	displaySet() { // Displays posts from queue
		this.displayPosts(this.postQueue.queue)
	}
	displayPosts(set) {
		// clear container
		this.container.innerHTML = ""
		let index = 0
		const renderedPosts = new Set()
		const postMediaMap = new Map()
		const addPost = (media, post) => {
			if (post.escalated) {
				renderedPosts.add(post) // idk? seems to fix it, but for what reason?
				return
			}
			media.forEach(media => {
				// check if overflowing
				if (index >= this.setCount) {
					this.overflowPost = post
					this.overflowMedia.push(media)
					return
				}
				renderedPosts.add(post)

				const x = index % this.gridX
				const y = Math.floor(index / this.gridX)
				const element = document.createElement("div")
				element.classList.add("grid-item")
				element.style.gridColumn = x + 1
				element.style.gridRow = y + 1
				post.labels.forEach(label => {
					if (this.labelValues.has(label.val)) {
						// highlight element
						element.style.borderColor = "red"
						element.style.borderWidth = "5px"
						element.style.borderStyle = "dotted"
						element.style.zIndex = "1"
					}
				})
				postMediaMap.set(element, post)
				if (media.playlist) { // video
					if (!media.videoCache) this.preloadMedia(media)
					const video = media.videoCache
					video.classList.remove("hidden")
					try {
						video.play()
					} catch (error) {
						console.warn(error)
					}
					video.playbackRate = 2
					video.controls = true
					if (media.alt) {
						video.title = media.alt
						video.alt = media.alt
					}
					video.style.width = "100%"
					video.style.height = "100%"
					element.appendChild(video)
				} else if (media.fullsize) { // image
					const image = document.createElement("img")
					image.src = media.fullsize
					image.title = media.alt
					image.alt = media.alt
					image.style.width = "100%"
					image.style.height = "100%"
					element.appendChild(image)
				}
				element.addEventListener("click", () => {
					this.postQueue.escalatePost(post)
					// hide all images from post
					postMediaMap.forEach((ozherPost, element) => {
						if (ozherPost == post) element.remove()
					})
				})
				this.container.appendChild(element)
				index++
			})
		}
		if (this.overflowPost) {
			addPost(this.overflowMedia, this.overflowPost)
			this.overflowPost = null
		}
		this.overflowMedia = []
		for (let i = 0; i < set.length; i++) {
			if (this.overflowPost) break
			const post = set[i]
			addPost(post.renderImages, post)
		}
		// set current posts
		this.currentPosts = Array.from(renderedPosts)
	}
}

module.exports = MultiplePostEscalateInterface
