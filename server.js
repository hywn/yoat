const http = require('http')
const yoat = require('./yoat.js')

http.createServer((req, res) => {

	const params = new URL(req.headers.host + req.url).searchParams

	res.setHeader('Access-Control-Allow-Origin', '*') // expecting to be accessed through file://.../test.html
	res.setHeader('content-type', 'application/json')

	const id = params.get('id')

	if (!id) {
		res.end('null')
		return
	}

	yoat.get_audio(id)
		.then(audio => res.end(JSON.stringify(audio)))

}).listen(8080)