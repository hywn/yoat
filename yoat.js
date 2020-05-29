async function scurl(url)
{
	return fetch(url)
		.then(res => res.text())
}

const YOUTUBE_URL = 'https://www.youtube.com'

/***************/
/** main code **/
/***************/

/* given a youtube video's id
**
** return a URL to the video's highest-bitrate audio stream
*/
export default async function get_audio(video_id)
{
	// get and extract info from 'player_response' (see get_player_response for more info)

	const player_response = await get_player_response(video_id)

	if (!player_response)
		return null

	const {
		videoDetails : {
			title: title,
			author: author
		},
		streamingData: {
			adaptiveFormats: streams
		}
	} = player_response

	// select the best audio stream and extract information from it

	const audio_streams = streams
		.filter(f => f.mimeType.includes('audio'))
		.sort((a, b) => b.averageBitrate - a.averageBitrate)

	let {
		url:             url,
		cipher:          cipher1,
		signatureCipher: cipher2,
		averageBitrate:  bitrate
	} = audio_streams[0]

	// the way this works is:
	// - if `url` exists, that's the stream url, no processing required
	// - if `url` no exista, either `cipher` OR `signatureCipher` existen.
	//       (their contents are the same, idk why the name varies)
	// - `cipher` or `signatureCipher` (just call it cipher) is a URL parameter list
	//       with two relevant fields: s and url. to form the complete stream url,
	//       you need to run s through the video's signature function
	//       and stick it on the end of url.

	if (!url) {
		const cipher = new URLSearchParams(cipher1 || cipher2)

		const incomplete_url = cipher.get('url')
		const s              = cipher.get('s')

		if (!s) {
			console.error('could not find s in cipher')
			console.error(audio_streams[0])
			return { error: "no s" }
		}

		const signature      = (await get_signature_function(video_id))(s)

		url = `${incomplete_url}&sig=${signature}`
	}

	// return all the extracted info in nice object

	return { id: video_id, title, author, url, bitrate }

}

/* given a video's id
**
** return the video's player response,
** an object full of information
** provided graciously in youtube's own get_video_info endpoint
*/
async function get_player_response(id)
{
	const contents = await scurl(`${YOUTUBE_URL}/get_video_info?video_id=${id}`)

	return JSON.parse(new URLSearchParams(contents).get('player_response'))
}

/******************************/
/** signature function stuff **/
/******************************/

/* given a video's id
**
** return the video's special 'signature function'
** that unscrambles the 's' parameter that belongs to ciphered videos
*/
async function get_signature_function(video_id)
{
	// gets watch page
	const watch_text = await scurl(`${YOUTUBE_URL}/watch?v=${video_id}`)

	// finds base.js url
	const relative_url = watch_text.match(/"(\/[^"]+\/base.js)"/)[1]
	if (!relative_url)
		throw 'could not find base.js url in watch_text'

	// gets base.js
	const base_js_text = await scurl(YOUTUBE_URL + relative_url)

	// extracts signature function from base.js
	return extract_signature_function(base_js_text)
}

// as of now, each signature function is made up of
// a series of calls to the following three types of functions.
// the following describes the three types of functions as so:
// '<unique word found only in that scramble function>': <scramble function itself>
const SCRAMBLES = Object.entries({
	'reverse': (a, b) => {
		a.reverse()
		return a
	},
	'splice':  (a, b) => {
		a.splice(0, b)
		return a
	},
	'length':  (a, b) => {
		const c = a[0]
		a[0] = a[b % a.length]
		a[b] = c
		return a
	}
})

/* given a base.js
**
** return its extracted signature function
*/
function extract_signature_function(base_js_text)
{
	// find the signature function in the code
	// seems to always start with a split("") and end with a join("")
	const sigfun_text = base_js_text.match(/function...{[^{}]+split\(""\)[^{}]+join\(""\)}/)[0]

	// identify what scramble functions it calls with what arguments
	const scramble_calls = [...sigfun_text.matchAll(/(\w+)\.(\w+)\((\w+),(\w+)\)/g)]
		.map(([ , , fun_name, arg1, arg2]) => [fun_name, Number(arg1), Number(arg2)])

	// identify the names of the scramble functions
	const scramble_names = [...new Set(scramble_calls.map(([fun_name]) => fun_name))]

	// find out which of the three scramble functions each of the names are
	const name_to_fun = Object.fromEntries(
			scramble_names.map(fun_name => {
				const fun_pattern = new RegExp(`${fun_name}:function.+?}`)

				const fun_text = base_js_text.match(fun_pattern)[0]

				const [, fun] = SCRAMBLES.find(([key]) => fun_text.includes(key))

				return [fun_name, fun]
			})
		)

	// return the signature function,
	// i.e. a string, broken up into characters,
	// passed through a series of scramble functions,
	// and reconstructed
	return string =>
		scramble_calls.reduce(
			(chars, [fun_name, arg1, arg2]) =>
				name_to_fun[fun_name](
					isNaN(arg1) ? chars : arg1,
					isNaN(arg2) ? chars : arg2
				)
			, string.split('')
		).join('')
}