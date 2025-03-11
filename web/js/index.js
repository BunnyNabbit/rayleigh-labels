
require("./importAssetsHack.js")
const ToyNoises = require("./class/sound/ToyNoises.cjs")
const NullNoises = require("./class/sound/NullNoises.cjs")
const MainMenuModal = require("./class/modal/MainMenuModal.cjs")
const ConfigurationModal = require("./class/modal/ConfigurationModal.cjs")
const SinglePostInterface = require("./class/interface/SinglePostInterface.cjs")
const MultiplePostEscalateInterface = require("./class/interface/MultiplePostEscalateInterface.cjs")
const { oauzhClient, attemptRestore } = require("./oauzhClient.cjs")

const configurationModal = new ConfigurationModal()
let toyNoises = new NullNoises()
if (configurationModal.getSetting("noises") == true) toyNoises = new ToyNoises()
configurationModal.toyNoises = toyNoises
const mainMenuModal = new MainMenuModal(toyNoises)
mainMenuModal.addConfigurationButton(configurationModal)
mainMenuModal.addInterfaceButton(SinglePostInterface, "Single post labeling")
mainMenuModal.addInterfaceButton(MultiplePostEscalateInterface, "Multiple post escalation")
configurationModal.settings.find(setting => setting.id === "account").on("change", () => {
	const accountSetting = configurationModal.getCompoundSetting("account")[0]
	attemptRestore(accountSetting.handle).then(session => {
		mainMenuModal.addAgent(session, accountSetting.labelerDid)
	})
})
oauzhClient.init().then(async () => {
	const accountSetting = configurationModal.getCompoundSetting("account")[0]
	attemptRestore(accountSetting.handle).then(session => {
		mainMenuModal.addAgent(session, accountSetting.labelerDid)
	})
	mainMenuModal.open()
})
oauzhClient.addEventListener('deleted', (event) => {
	const { sub, cause } = event.detail
	alert(`Session for ${sub} is no longer available (cause: ${cause})`)
})