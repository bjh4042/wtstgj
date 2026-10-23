import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseCSV,SOURCE_FILES} from '../dist/compatibility/canonical-source-format.mjs';
import {parseCSV as activeParseCSV,SOURCE_FILES as activeFiles} from '../dist/compatibility/canonical-adapter.mjs';

function importGraph(entry){
 const seen=new Set();
 function visit(file){
  if(seen.has(file))return;
  seen.add(file);
  const source=readFileSync(file,'utf8');
  for(const match of source.matchAll(/\b(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?['"](\.[^'"]+)['"]/g))visit(resolve(dirname(file),match[1]));
 }
 visit(fileURLToPath(entry));return [...seen].map(x=>x.split('/').slice(-2).join('/'));
}

test('staged candidate import graph excludes old source loader and legacy Yeji adapter',()=>{
 const graph=importGraph(new URL('../dist/ordinary/candidate-entry.mjs',import.meta.url));
 for(const stale of ['compatibility/canonical-adapter.mjs','compatibility/canonical-source-loader.mjs','compatibility/preview-opponent-adapter.mjs'])assert.ok(!graph.includes(stale),stale);
 assert.ok(graph.includes('compatibility/canonical-source-format.mjs'));
 assert.ok(graph.includes('compatibility/opponent-namespace.mjs'));
});

test('active adapter retains exactly the shared CSV parser and source list',()=>{
 assert.equal(activeParseCSV,parseCSV);assert.equal(activeFiles,SOURCE_FILES);
 assert.deepEqual(parseCSV('\uFEFFid,note\r\n1,"a,b"\r\n2,"a\n""b"""\r\n'),[{id:'1',note:'a,b'},{id:'2',note:'a\n"b"'}]);
 assert.throws(()=>parseCSV('a,b\n1'),/column count/);
});
