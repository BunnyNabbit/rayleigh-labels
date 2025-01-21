function randomIntFromInterval(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

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

module.exports = {
	randomIntFromInterval,
	chunkArray
}
