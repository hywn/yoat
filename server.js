import { serve } from 'https://deno.land/std/http/server.ts'
import get_audio from './yoat.js'

const port = 8080

const headers = new Headers({
	'content-type': 'application/json',
	'Access-Control-Allow-Origin': '*'
})

const server = serve({ port })
console.log(`now serving on port ${port}`)

for await (const req of server) {

	const id = new URL('a://a' + req.url).searchParams.get('id')

	if (!id) {
		req.respond({ headers, body: 'null' })
		continue
	}

	get_audio(id)
		.then(audio => req.respond({
			headers,
			body: JSON.stringify(audio)
		}))

}