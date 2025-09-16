const { Dexie } = require("dexie")

const db = new Dexie("myDatabase")

db.version(1).stores({
	// repoCrawlStatus: 'did, collection, status, dateStartIndex, dateEndIndex',
	// searchCrawl: 'searchQuery, status, dateStartIndex, dateEndIndex',
	acknowledgedPosts: "uri, resolution",
	// reviewPendingPost: 'uri, did',
	// pendingHydrate: 'uri',
})

module.exports = db
