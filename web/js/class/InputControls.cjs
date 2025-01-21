const PostQueue = require("./PostQueue.cjs")

class InputControls {
	constructor(postQueue) {
		this.postQueue = postQueue
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
	}
	switchLeft() {
		this.postQueue.switchPostImage(InputControls.DIRECTION.LEFT)
	}
	switchRight() {
		this.postQueue.switchPostImage(InputControls.DIRECTION.RIGHT)
	}
	next() {
		if (!this.postQueue.currentPost) return
		if (!this.postQueue.viewedAll) return this.postQueue.switchPostImage(InputControls.DIRECTION.RIGHT)
		const post = this.postQueue.queue.shift()
		this.postQueue.backQueue.push(post)
		if (this.postQueue.backQueue.length > PostQueue.backQueueLimit) {
			const removedPost = this.postQueue.backQueue.shift()
			if (removedPost.renderImages[0].videoCache) {
				removedPost.renderImages[0].videoCache.remove()
				// Destroy HLS context
				if (removedPost.renderImages[0].hls) {
					removedPost.renderImages[0].hls.destroy()
				}
			}
		}
		const postLabels = this.postQueue.currentPost.labels
		const currentLabelValues = this.postQueue.labelElements.map(element => { return { name: element.id, checked: element.checked } })
		const add = currentLabelValues.filter(currentValue => currentValue.checked == true && !postLabels.some(postLabel => postLabel.val == currentValue.name)).map(label => label.name)
		const negate = currentLabelValues.filter(currentValue => currentValue.checked == false && postLabels.some(postLabel => postLabel.val == currentValue.name)).map(label => label.name)
		this.postQueue.api.label({
			add, negate, uri: this.postQueue.currentPost.uri
		})
		this.postQueue.currentPost.labels = this.postQueue.labelElements.filter(element => element.checked == true).map(element => { return { val: element.id } })
		if (this.postQueue.queue[0]) {
			this.postQueue.displayPost(this.postQueue.queue[0])
			// preload next posts
			for (let i = 1; i < 6; i++) {
				if (this.postQueue.queue[i] && !this.postQueue.queue[i].preloaded) {
					this.postQueue.queue[i].preloaded = true
					this.postQueue.queue[i].renderImages.forEach(media => {
						this.postQueue.preloadMedia(media)
					})
				}
			}
		} else {
			this.postQueue.currentPost = null
			this.postQueue.currentSubjectElement.src = this.postQueue.placeholderImageUrl
			this.postQueue.getSet()
		}
	}
	previous() {
		if (!this.postQueue.currentPost) return
		if (!this.postQueue.backQueue.length) return
		const post = this.postQueue.backQueue.pop()
		this.postQueue.queue.unshift(post)
		this.postQueue.displayPost(post)
	}
	static DIRECTION = {
		LEFT: -1,
		RIGHT: 1,
		STILL: 0
	}
}
module.exports = InputControls
