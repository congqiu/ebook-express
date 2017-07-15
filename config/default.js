module.exports = {
	port: 3000,
	baseUrl: 'http://www.book.xyz',
	proxy: 'http://10.1.0.192:3000',
	session: {
		secret: 'ebook',
		key: 'ebook',
		maxAge: 25920000
	},
	mysql: {
		host: '127.0.0.1',
		user: '',
		password: '',
		port: '3306',
		database: '',
		connectionLimit: 10
	},
	mailgun: {
		apikey: '',
		domain: '',
		from: ''
	}
}