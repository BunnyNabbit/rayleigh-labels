
require("./importAssetsHack.js")
const ToyNoises = require("./class/sound/ToyNoises.cjs")
const NullNoises = require("./class/sound/NullNoises.cjs")
const MainMenuModal = require("./class/modal/MainMenuModal.cjs")
const ConfigurationModal = require("./class/modal/ConfigurationModal.cjs")
const SinglePostInterface = require("./class/interface/SinglePostInterface.cjs")
const MultiplePostEscalateInterface = require("./class/interface/MultiplePostEscalateInterface.cjs")

const configurationModal = new ConfigurationModal()
let toyNoises = new NullNoises()
if (configurationModal.getSetting("noises") == true) toyNoises = new ToyNoises()
configurationModal.toyNoises = toyNoises
const mainMenuModal = new MainMenuModal(toyNoises)
mainMenuModal.addConfigurationButton(configurationModal)
mainMenuModal.addInterfaceButton(SinglePostInterface, "Single post labeling")
mainMenuModal.addInterfaceButton(MultiplePostEscalateInterface, "Multiple post escalation")
mainMenuModal.open()