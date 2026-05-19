import os, http.server, socketserver

os.chdir('/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files')
port = int(os.environ.get('PORT', 8080))
handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(('', port), handler) as httpd:
    print(f'Serving on http://localhost:{port}', flush=True)
    httpd.serve_forever()
