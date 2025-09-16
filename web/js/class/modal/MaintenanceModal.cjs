const BaseMenuModal = require("./BaseMenuModal.cjs")
const DatabaseDump = require("../DatabaseDump.cjs")
const db = require("../../db.cjs")

class MaintenanceModal extends BaseMenuModal {
	/** */
	constructor(toyNoises) {
		super(false, toyNoises)
		this.addCloseButton()
		this.addButton("Export configuration", () => {
			const storage = {}
			Object.keys(localStorage).forEach((key) => {
				if (key.startsWith(MaintenanceModal.localStoragePrefix)) {
					storage[key] = localStorage.getItem(key)
				}
			})
			const blob = new Blob([JSON.stringify(storage)], { type: "application/json" })
			const url = URL.createObjectURL(blob)
			const a = document.createElement("a")
			a.href = url
			a.download = `${MaintenanceModal.generateFilenameDate("rayleigh-config")}`
			a.click()
			URL.revokeObjectURL(url)
		})
		this.addButton("Import configuration", () => {
			const input = document.createElement("input")
			input.type = "file"
			input.accept = ".json"
			input.onchange = (event) => {
				const file = event.target.files[0]
				const reader = new FileReader()
				reader.onload = (event) => {
					const data = JSON.parse(event.target.result)
					for (const key in data) {
						localStorage.setItem(key, data[key])
					}
					// prompt refresh
					if (confirm("Refresh page to apply changes?")) {
						window.location.reload()
					}
				}
				reader.readAsText(file)
			}
			input.click()
		})
		this.addButton("Export database", async () => {
			// Create a new handle
			const handle = await showSaveFilePicker(MaintenanceModal.dumpObject)
			DatabaseDump.export(db, handle).catch((error) => {
				console.error("Import error:", error)
				alert("Import failed: " + error.message)
			})
		})
		this.addButton("Import database", async () => {
			// Create a new handle
			const handle = await showOpenFilePicker(MaintenanceModal.dumpObject)
			DatabaseDump.import(db, handle[0]).catch((error) => {
				console.error("Import error:", error)
				alert("Import failed: " + error.message)
			})
		})
	}

	static generateFilenameDate(name) {
		const date = new Date()
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, "0")
		const day = String(date.getDate()).padStart(2, "0")
		return `${name}-${year}-${month}-${day}.json`
	}

	static dumpObject = {
		multiple: false,
		id: "dump",
		startIn: "downloads",
		types: [
			{
				description: "Database dump",
				accept: {
					"application/octet-stream": [".rayleighdump"],
				},
			},
		],
	}
	static localStoragePrefix = "rayleigh"
}

module.exports = MaintenanceModal
