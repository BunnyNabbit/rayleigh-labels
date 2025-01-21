const { SoundEffect } = require("../../vendor/sfxr")

/**
 * Class for playing SFXR sound effects
 */
class ToyNoises {
	/**
	 * Create a ToyNoises instance.
	 */
	constructor() {
		this.sfxrGenerationDegradation = 0
		this.interval = setInterval(() => { this.sfxrGenerationDegradation = 1 }, 300)
	}

	/**
	 * Play a sound based on the provided sfxr payload.
	 * @param {string} sfxrPayload - The payload for the sound effect.
	 */
	playSound(sfxrPayload) {
		if (!SoundEffect) return
		this.sfxrGenerationDegradation += 0.1
		let audio = new SoundEffect(sfxrPayload).parameters.mutate()
		audio.sound_vol = (0.04 / this.sfxrGenerationDegradation) * 1.5
		audio.sample_rate = Math.round((44100 / this.sfxrGenerationDegradation) * 1)
		audio = new SoundEffect(audio).generate().getAudio()
		audio.play()
	}

	/**
	 * Destroy the ToyNoises instance and clear the interval.
	 */
	destroy() {
		clearInterval(this.interval)
	}

	/**
	 * Static object containing predefined sound identifiers.
	 */
	static sounds = {
		lastInPost: "11111GvZH7jwT4FjsvL4Kt7D9TBj81nTkcvBs3VbcAfsTdCKdtFu6AmMN5iKGM55Y4cPxiz6SG7etbWKP2QkiVwBfo54smV8s9t7v37V7MT1vDs7CEjwSjSf",
		hasLabel: "3Yw2CxDjPUsnbj3nAaw1boqFv8ordh7fvnYwRtUhUouLzXFrNBA8YeybkVQCnjpiXefXnmDMmdgzarbnuxdhmnXrNsnd99tdHiHZYYEAoFANNHyhiycwYCX8B",
		addLabel: "34T6PktTUDAmJbCDoG4ZpNfWdzxkh2X7RQJBpEtRydQ6V21jpTtsGMGu4qDVioCHUeayPmzGf2HVzxQkUZkg5wpjHFJAWahbhYfaq9DefuN7uRYXsKmbcNWrT",
		removeLabel: "34T6PktTUDAmJbCDoG4ZpNf1dUxfN4tkxPxnYkKQZWzNxssWrEzepcSwfgvdcdKmxF1a2EnN5C5RHHCviY45PniXkeZJTFbLfuZe8f4ohaAfVyoEpk5deUYEj",
		videoLoad: "57uBnWWjHLipzPva3aWuvVAKjtNZVqPXK1rgnULF75gk39WvWUNqpZbnQmQj3NPQwkcUQ6VQkHGpYb4s6vJvXNX27gzA9ibekarmFqKXYQfmhKQuffiEidF35"
	}
}

module.exports = ToyNoises
