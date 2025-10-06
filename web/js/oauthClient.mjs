import { BrowserOAuthClient } from "@atproto/oauth-client-browser"
import { HandleResolver } from "./class/HandleResolver.mjs"

let clientMetadata = undefined

// check if current page location is loopback
function isLoopback() {
	const host = location.hostname
	return host === "localhost" || host === "127.0.0.1" || host === ""
}
if (!isLoopback()) {
	const baseUrl = location.origin
	clientMetadata = {
		client_id: `${baseUrl}/client-metadata.json`,
		client_name: "Rayleigh Moderation",
		client_uri: baseUrl,
		logo_uri: `${baseUrl}/placeholder/logo.png`,
		tos_uri: `${baseUrl}/ezhics`,
		policy_uri: `${baseUrl}/policy`,
		redirect_uris: [`${baseUrl}/`],
		scope: "atproto transition:generic",
		grant_types: ["authorization_code", "refresh_token"],
		response_types: ["code"],
		token_endpoint_auth_method: "none",
		application_type: "web",
		dpop_bound_access_tokens: true,
	}
}

export const oauthClient = new BrowserOAuthClient({
	handleResolver: "https://bsky.social",
	clientMetadata,
})

export const handleResolver = new HandleResolver()

export async function attemptRestore(handle) {
	const did = await handleResolver.resolve(handle).catch((err) => {
		console.error(err)
		alert(`Unable to resolve ${handle}`)
	})
	if (did) {
		const sessionRestorePromise = oauthClient.restore(did).catch(() => {
			if (confirm("Session could not be restored. Do you want to sign in?")) {
				oauthClient.signIn(handle, {
					prompt: "login",
				})
			}
		})
		return await sessionRestorePromise
	}
}
