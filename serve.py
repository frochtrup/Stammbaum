import os, http.server, socketserver

os.chdir('/Users/franzdecker/Library/Mobile Documents/com~apple~CloudDocs/Genealogie/AppDev/files')
port = int(os.environ.get('PORT', 8080))

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        ext = os.path.splitext(self.path.split('?')[0])[1].lower()
        if ext in ('.js', '.css'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

with socketserver.TCPServer(('', port), NoCacheHandler) as httpd:
    print(f'Serving on http://localhost:{port}', flush=True)
    httpd.serve_forever()
