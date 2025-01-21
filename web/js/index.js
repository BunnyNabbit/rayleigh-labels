const API = require("./class/API.cjs")
const ToyNoises = require("./class/sound/ToyNoises.cjs")
require("./importAssetsHack.js")
const PostQueue = require("./class/PostQueue.cjs")
const SinglePostInterface = require("./class/SinglePostInterface.cjs")
const api = new API()
const postQueue = new PostQueue(api)
new SinglePostInterface(postQueue, new ToyNoises())
