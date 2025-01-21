const EventEmitter = require("events")

class InputControls extends EventEmitter {
	constructor() {
		super()
		document.addEventListener("keydown", (event) => {
			if (event.key == "ArrowLeft") {
				this.emit("switchPostImage", InputControls.DIRECTION.LEFT)
			}
			if (event.key == "ArrowRight") {
				this.emit("switchPostImage", InputControls.DIRECTION.RIGHT)
			}
			if (event.key == "Enter") {
				this.emit("next")
			}
			if (event.key == "Backspace") {
				this.emit("previous")
			}
		})
		let touchStartX = null
		let touchStartY = null
		const threshold = 50
		document.addEventListener("touchstart", (event) => {
			touchStartX = event.touches[0].clientX
			touchStartY = event.touches[0].clientY
		})
		document.addEventListener("touchend", (event) => {
			if (!touchStartX || !touchStartY) return
			const touchEndX = event.changedTouches[0].clientX
			const touchEndY = event.changedTouches[0].clientY
			const deltaX = touchEndX - touchStartX
			const deltaY = touchEndY - touchStartY
			if (Math.abs(deltaX) > threshold && Math.abs(deltaY) < threshold) {
				if (deltaX > 0) {
					this.emit("switchPostImage", InputControls.DIRECTION.RIGHT)
				} else {
					this.emit("switchPostImage", InputControls.DIRECTION.LEFT)
				}
			}
			if (Math.abs(deltaY) > threshold && Math.abs(deltaX) < threshold) {
				if (deltaY < 0) {
					this.emit("next")
				} else {
					this.emit("previous")
				}
			}
			touchStartX = null
			touchStartY = null
		})
	}

	static DIRECTION = {
		LEFT: -1,
		RIGHT: 1,
		STILL: 0
	}
}
module.exports = InputControls
