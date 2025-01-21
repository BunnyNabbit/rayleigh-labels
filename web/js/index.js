const API = require("./class/API.cjs")
const ToyNoises = require("./class/sound/ToyNoises.cjs")
require("./importAssetsHack.js")
const PostQueue = require("./class/PostQueue.cjs")
const api = new API()
new PostQueue(api, new ToyNoises())
