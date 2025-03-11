require("dotenv").config()
const express = require('express')
const app = express()
const port = process.env.PORT || 3213
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`
const codeOfEthicsUrl = process.env.CODE_OF_ETHICS_URL || `${baseUrl}/ezhics`
const privacyPolicyUrl = process.env.PRIVACY_POLICY_URL || `${baseUrl}/privacy`
app.use('/', express.static(require("path").join(__dirname, "dist")))

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*")
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
	next()
})

app.get('/client-metadata.json', async (req, res) => {
	res.json({
		"client_id": `${baseUrl}/client-metadata.json`,
		"client_name": "Rayleigh Moderation",
		"client_uri": baseUrl,
		"logo_uri": `${baseUrl}/web/placeholder/logo.png`,
		"tos_uri": codeOfEthicsUrl,
		"policy_uri": privacyPolicyUrl,
		"redirect_uris": [`${baseUrl}/`],
		"scope": "atproto transition:generic",
		"grant_types": ["authorization_code", "refresh_token"],
		"response_types": ["code"],
		"token_endpoint_auth_method": "none",
		"application_type": "web",
		"dpop_bound_access_tokens": true
	})
})

app.listen(port, () => {
	console.log(`Rayleigh listening on port ${port}`)
})