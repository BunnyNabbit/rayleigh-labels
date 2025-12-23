import "./importAssetsHack.mjs"
import { ToyNoises } from "./class/sound/ToyNoises.mjs"
import { NullNoises } from "./class/sound/NullNoises.mjs"
import { MainMenuModal } from "./class/modal/MainMenuModal.mjs"
import { ConfigurationModal } from "./class/modal/ConfigurationModal.mjs"
import { MaintenanceModal } from "./class/modal/MaintenanceModal.mjs"
import { SinglePostInterface } from "./class/interface/SinglePostInterface.mjs"
import { MultiplePostEscalateInterface } from "./class/interface/MultiplePostEscalateInterface.mjs"
import { oauthClient, attemptRestore } from "./oauthClient.mjs"

const configurationModal = new ConfigurationModal()
let toyNoises = new NullNoises()
if (configurationModal.getSetting("noises") == true) toyNoises = new ToyNoises()
const maintenanceModal = new MaintenanceModal(toyNoises)
configurationModal.toyNoises = toyNoises
const mainMenuModal = new MainMenuModal(toyNoises)
mainMenuModal.addConfigurationButton(configurationModal, "Configuration")
mainMenuModal.addModalButton(maintenanceModal, "Maintenance")
mainMenuModal.addInterfaceButton(SinglePostInterface, "Single post labeling")
mainMenuModal.addInterfaceButton(MultiplePostEscalateInterface, "Multiple post escalation")
configurationModal.settings
	.find((setting) => setting.id === "account")
	.on("change", () => {
		const accountSetting = configurationModal.getCompoundSetting("account")[0]
		attemptRestore(accountSetting.handle).then((session) => {
			mainMenuModal.addAgent(session, accountSetting.labelerDid)
		})
	})
oauthClient.init().then(async () => {
	const accountSetting = configurationModal.getCompoundSetting("account")[0]
	attemptRestore(accountSetting.handle).then((session) => {
		mainMenuModal.addAgent(session, accountSetting.labelerDid)
	})
	mainMenuModal.open()
})
oauthClient.addEventListener("deleted", (event) => {
	const { sub, cause } = event.detail
	alert(`Session for ${sub} is no longer available (cause: ${cause})`)
})
window.addEventListener("click", (event) => {
	const fullscreenSetting = configurationModal.getSetting("fullscreen")
	if (fullscreenSetting == true && !document.fullscreenElement) {
		event.target.requestFullscreen()
	}
})
