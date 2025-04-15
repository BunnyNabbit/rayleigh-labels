/** Represents a growing buffer. */
class GrowBuffer {
	/**Creates a new GrowBuffer instance.
	 * @param {number} initialSize - The initial size of the buffer.
	 * @param {number} resizeIncrement - The amount to increase the buffer size when it needs to grow.
	 */
	constructor(initialSize = 128, resizeIncrement = 128) {
		this.currentSize = 0
		this.writeCursor = 0
		this.resizeIncrement = resizeIncrement
		this.buffer = new Uint8Array(initialSize)
	}
	resize(newSize) {
		const newBuffer = new Uint8Array(newSize)
		newBuffer.set(this.buffer.subarray(0, this.currentSize))
		this.buffer = newBuffer
	}
	/** Trims bytes from beginning of buffer. */
	trim(num) {
		const newBuffer = new Uint8Array((this.currentSize + this.resizeIncrement) - num)
		const removed = this.buffer.subarray(0, num)
		newBuffer.set(this.buffer.subarray(num, this.currentSize), 0)
		this.buffer = newBuffer
		this.currentSize -= num
		this.writeCursor -= num
		if (this.writeCursor < 0) {
			throw new Error("Write cursor is negative")
		}
		return removed

	}
	writeBytes(bytes) {
		if (this.writeCursor + bytes.length >= this.buffer.length) {
			this.resize(this.buffer.length + this.resizeIncrement + bytes.length)
		}
		this.buffer.set(bytes, this.writeCursor)
		this.writeCursor += bytes.length
		this.currentSize += bytes.length
	}
	writeString(string, writeLength) {
		const encoder = new TextEncoder()
		const bytes = encoder.encode(string)
		if (writeLength) {
			this.writeUint32(bytes.length)
		}
		this.writeBytes(bytes)
	}
	writeUint32(value) {
		if (this.writeCursor + 4 >= this.buffer.length) {
			this.resize(this.buffer.length + this.resizeIncrement + 4)
		}
		const view = new DataView(this.buffer.buffer, this.writeCursor, 4)
		view.setUint32(0, value, true)
		this.writeCursor += 4
		this.currentSize += 4
	}
	toBuffer() {
		return this.buffer.subarray(0, this.currentSize)
	}
}
class StreamReader extends GrowBuffer {
	constructor(stream) {
		super()
		this.stream = stream
		this.reader = stream.getReader()
		this.bufferReadBytes = 0
	}
	/** Trims read bytes of internal buffer.. */
	trim() {
		const trimmed = super.trim(this.bufferReadBytes)
		this.bufferReadBytes = 0
		return trimmed
	}
	async read(chunkSize = 1024) {
		while (this.remainingBufferedBytes < chunkSize) {
			const { done, value } = await this.reader.read()
			if (done) {
				break
			}
			this.writeBytes(value)
		}
	}
	async readBytes(num) {
		if (this.remainingBufferedBytes < num) {
			await this.read(num)
		}
		const bytes = this.buffer.subarray(this.bufferReadBytes, this.bufferReadBytes + num)
		this.bufferReadBytes += num
		return bytes
	}
	async readUint32() {
		if (this.remainingBufferedBytes < 4) {
			await this.read(4)
		}
		const view = new DataView(this.buffer.buffer, this.bufferReadBytes, 4)
		const value = view.getUint32(0, true)
		this.bufferReadBytes += 4
		return value
	}
	async readString(length = false) {
		if (length) {
			if (this.remainingBufferedBytes < length) {
				await this.read(length)
			}
			const bytes = this.buffer.subarray(this.bufferReadBytes, this.bufferReadBytes + length)
			this.bufferReadBytes += length
			return new TextDecoder().decode(bytes)
		} else {
			const stringLength = await this.readUint32()
			if (this.currentSize < stringLength) {
				await this.read(stringLength)
			}
			const string = await this.readString(stringLength)
			return string
		}
	}
	get remainingBufferedBytes() {
		return this.currentSize - this.bufferReadBytes
	}
	async close() {
		await this.reader.cancel()
	}
}

class DatabaseDump {
	static collectionTypes = {
		"eof": 0x00,
		"acknowledgedPosts": 0x01,
		"metadata": 0xff
	}

	static async export(db, fileHandle) {
		const writeStream = await fileHandle.createWritable({
			keepExistingData: false,
			mode: "exclusive"
		})
		const deflateStream = new CompressionStream("deflate")
		deflateStream.readable.pipeTo(writeStream)
		const deflateStreamWriter = deflateStream.writable.getWriter()

		{ // metadata TODO: use GrowBuffer
			await deflateStreamWriter.write(new Uint8Array([DatabaseDump.collectionTypes.metadata]))
			const metadataString = JSON.stringify({
				"version": 1,
				"timestamp": Date.now(),
				"tables": [
					"acknowledgedPosts"
				]
			})
			// size
			const metadataSizeArray = new Uint8Array(4)
			const metadataSizeView = new DataView(metadataSizeArray.buffer)
			metadataSizeView.setUint32(0, metadataString.length, true)
			await deflateStreamWriter.write(metadataSizeArray)
			await deflateStreamWriter.write(new TextEncoder().encode(metadataString))
		}
		{ // acknowledgedPosts
			await deflateStreamWriter.write(new Uint8Array([DatabaseDump.collectionTypes.acknowledgedPosts]))
			// post count
			const postCount = await db.acknowledgedPosts.count()
			const lengthBuffer = new GrowBuffer(4)
			lengthBuffer.writeUint32(postCount)
			await deflateStreamWriter.write(lengthBuffer.toBuffer())
			// data (1000 items per chunk)
			for (let i = 0; i < postCount; i += 1000) {
				const posts = await db.acknowledgedPosts.offset(i).limit(1000).toArray()
				const postsBuffer = new GrowBuffer(1024, 1024)
				for (const post of posts) {
					const postString = JSON.stringify(post)
					postsBuffer.writeString(postString, true)
				}
				await deflateStreamWriter.write(postsBuffer.toBuffer())
			}
		}
		{ // eof
			await deflateStreamWriter.write(new Uint8Array([DatabaseDump.collectionTypes.eof]))
		}
		// close file
		await deflateStreamWriter.close()
	}

	static async import(db, fileHandle) {
		const fileStream = await fileHandle.getFile().then(file => file.stream())
		const deflateStream = new DecompressionStream("deflate")
		fileStream.pipeThrough(deflateStream)
		const streamReader = new StreamReader(deflateStream.readable)
		const stats = {
			imported: 0
		}
		let collectionType = (await streamReader.readBytes(1))[0]
		while (collectionType != DatabaseDump.collectionTypes.eof) {
			switch (collectionType) {
				case DatabaseDump.collectionTypes.metadata: {
					const metadataSize = await streamReader.readUint32()
					const metadataString = new TextDecoder().decode(await streamReader.readBytes(metadataSize))
					const metadata = JSON.parse(metadataString)
					console.log("Metadata:", metadata)
					break
				}
				case DatabaseDump.collectionTypes.acknowledgedPosts: {
					const postCount = await streamReader.readUint32()
					for (let i = 0; i < postCount; i++) {
						const postString = await streamReader.readString()
						const post = JSON.parse(postString)
						await db.acknowledgedPosts.put(post)
						stats.imported++
					}
					streamReader.trim()
					break
				}
				default:
					throw new Error("Unknown collection type")
			}
			collectionType = (await streamReader.readBytes(1))[0]
		}
		await streamReader.close()
		alert("Import completed: " + stats.imported + " items")
	}
}

module.exports = DatabaseDump
