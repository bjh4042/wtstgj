/** Small closed grammar for the canonical source expressions. No eval or JS execution. */
export function evaluateStoryExpression(expression,save,contract,visiting=new Set()){
 const tokens=String(expression).match(/inventory\.has\('[A-Za-z0-9_]+'\)|dex\.caught\(\d+\)|dex\.activated_count\(\)|&&|\|\||==|!|\(|\)|[A-Za-z_][A-Za-z0-9_]*|\d+/g)??[];
 if(tokens.join('')!==String(expression).replace(/\s/g,''))throw Error('Unsupported story expression');
 let pos=0;
 const take=token=>tokens[pos]===token?(pos++,true):false;
 const identifier=id=>{
  if(Object.hasOwn(contract.flags,id))return save.progress.flags[id]===true;
  if(Object.hasOwn(contract.gates,id)){
   if(visiting.has(id))throw Error('Cyclic story gate: '+id);
   return evaluateStoryExpression(contract.gates[id].expr,save,contract,new Set([...visiting,id]));
  }
  throw Error('Unknown story gate/flag: '+id);
 };
 function atom(){
  if(take('!'))return !atom();
  if(take('(')){const v=or();if(!take(')'))throw Error('Unclosed gate expression');return v}
  const token=tokens[pos++];if(!token)throw Error('Missing gate operand');
  if(/^\d+$/.test(token))return Number(token);
  if(token==='dex.activated_count()')return new Set(save.dex.caught).size;
  if(token.startsWith('dex.caught(')){const n=Number(token.slice(11,-1)),id=contract.speciesIdsByNumber[n];if(!id)throw Error('Unknown canonical dex number');return save.dex.caught.includes(id)}
  if(token.startsWith('inventory.has(')){const id=token.slice(15,-2);return (save.inventory[id]??save.progress.items[id]??0)>0||save.ownedTms.includes(id)}
  return identifier(token);
 }
 function compare(){const a=atom();if(take('=='))return a===atom();return a}
 function and(){let result=compare();while(take('&&')){const right=compare();result=!!result&&!!right}return result}
 function or(){let result=and();while(take('||')){const right=and();result=!!result||!!right}return result}
 const result=or();if(pos!==tokens.length)throw Error('Unexpected gate token');return !!result;
}
export function setStoryFlag(progress,contract,id,value){
 if(!Object.hasOwn(contract.flags,id)||typeof value!=='boolean')throw Error('Unknown or invalid canonical flag');
 progress.flags[id]=value;
}
