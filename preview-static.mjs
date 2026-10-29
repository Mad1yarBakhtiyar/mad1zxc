import http from 'node:http';
import {createReadStream,existsSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{
 let file;
 try {file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}
 catch {res.writeHead(400);res.end('Invalid URL');return;}
 if(file!==path.resolve(root)&&!file.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
 if(!existsSync(file)||statSync(file).isDirectory())file=path.join(root,'index.html');
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
 createReadStream(file).on('error',()=>{res.destroy();}).pipe(res);
});
server.listen(5173,'127.0.0.1',()=>console.log('SKAS: http://127.0.0.1:5173'));
