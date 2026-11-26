import { validPhoto, catalogPhoto, catalogColumns } from './photos.mjs';
// Turso HTTP pipeline API. Each checkout uses one SQLite transaction on the remote server.
import { AppError, integer, text } from './database.mjs';
const arg = v => typeof v === 'number' ? {type:'integer',value:String(v)} : {type:'text',value:String(v)};
export function openRemoteStore() {
  const url = process.env.TURSO_DATABASE_URL?.replace(/^(libsql|turso):/,'https:');
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url || !url.startsWith('https://') || !token) throw new Error('Remote database configuration missing');
  async function execute(statements) {
    const response = await fetch(url.replace(/\/$/,'')+'/v2/pipeline',{
      method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({requests:[...statements.map(([sql,args=[]])=>({type:'execute',stmt:{sql,args:args.map(arg)}})),{type:'close'}]})
    });
    if(!response.ok) throw new Error('Remote database request failed');
    const data=await response.json();
    return data.results.slice(0,-1).map(r=>{
      if(r.type==='error') throw new Error('Remote SQL failed: '+r.error?.code);
      const x=r.response.result;
      return {changes:x.affected_row_count,id:Number(x.last_insert_rowid),rows:x.rows.map(row=>Object.fromEntries(row.map((v,i)=>[x.cols[i].name,v.type==='null'?null:v.type==='integer'?Number(v.value):v.value])))};
    });
  }
  const query=async(sql,args=[]) => (await execute([[sql,args]]))[0];
  const products=async()=> (await query('SELECT '+catalogColumns+' FROM products ORDER BY id')).rows;
  return {
    products,
    async photo(id){return (await query('SELECT imageUrl FROM products WHERE id=?',[id])).rows[0]?.imageUrl;},
    async orders(){
      const rows=(await query('SELECT o.id,o.customerName,o.createdAt,i.productId,i.name,i.quantity,i.isBackorder FROM orders o JOIN order_items i ON i.orderId=o.id ORDER BY o.id DESC')).rows;
      const orders=new Map();
      for(const {id,customerName,createdAt,...item} of rows){
        if(!orders.has(id))orders.set(id,{id,customerName,createdAt,items:[]});
        orders.get(id).items.push({...item,isBackorder:Boolean(item.isBackorder)});
      }
      return [...orders.values()];
    },
    async addProduct(draft){
      const name=text(draft.name,'Name'),description=text(draft.description??'','Description',2000,true),category=text(draft.category||'Other','Category',80),unit=text(draft.unit||'item','Unit',80),imageUrl=text(draft.imageUrl??'','Image',96000,true),stock=integer(draft.stock,'Stock');
      if(imageUrl&&!validPhoto(imageUrl)){try{if(new URL(imageUrl).protocol!=='https:')throw Error();}catch{throw new AppError(400,'Use an HTTPS image URL.');}}
      return catalogPhoto((await query('INSERT INTO products(name,description,stock,category,imageUrl,unit) VALUES(?,?,?,?,?,?) RETURNING *',[name,description,stock,category,imageUrl,unit])).rows[0]);
    },
    async updatePhoto(id,input){
      integer(id,'Product ID',1);
      const photo=input.imageUrl;
      if(photo!==''&&!validPhoto(photo))throw new AppError(400,'Choose a valid JPEG photo.');
      const result=await query('UPDATE products SET imageUrl=? WHERE id=?',[photo,id]);
      if(!result.changes)throw new AppError(404,'Product not found.');
      return products();
    },
    async updateStock(id,input){
      integer(id,'Product ID',1);
      const result=input.delta!==undefined?await query('UPDATE products SET stock=stock+? WHERE id=? AND stock+? BETWEEN 0 AND 1000000',[integer(input.delta,'Stock adjustment',-1000000),id,input.delta]):await query('UPDATE products SET stock=? WHERE id=?',[integer(input.stock,'Stock'),id]);
      if(!result.changes)throw new AppError(409,'Stock update conflict.');
      return products();
    },
    async placeOrder(input){
      const customerName=text(input.customerName,'Customer name',100);
      if(!Array.isArray(input.items)||!input.items.length||input.items.length>100)throw new AppError(400,'Invalid basket.');
      const seen=new Set(),items=input.items.map(i=>{
        if(!i||typeof i!=='object')throw new AppError(400,'Invalid item.');
        integer(i.productId,'Product ID',1);integer(i.quantity,'Quantity',1,999);
        if(typeof i.isBackorder!=='boolean'||seen.has(i.productId))throw new AppError(400,'Invalid or duplicate item.');
        seen.add(i.productId);return i;
      });
      // One INSERT with a trigger performs validation and stock deductions atomically.
      const createdAt=new Date().toISOString();
      let row;
      try{row=(await query('INSERT INTO checkout_requests(customerName,createdAt,items) VALUES(?,?,?) RETURNING id',[customerName,createdAt,JSON.stringify(items)])).rows[0];}
      catch(e){if(String(e.message).includes('CONSTRAINT'))throw new AppError(409,'Basket stock changed. Refresh and retry.');throw e;}
      const saved=(await query('SELECT productId,name,quantity,isBackorder FROM order_items WHERE orderId=?',[row.id])).rows.map(i=>({...i,isBackorder:Boolean(i.isBackorder)}));
      return {order:{id:row.id,customerName,createdAt,items:saved},products:await products()};
    },
    async createSession(hash,expires){await query('INSERT INTO admin_sessions(token,expires) VALUES(?,?)',[hash,expires]);},
    async sessionValid(hash,now){return !!(await query('SELECT 1 FROM admin_sessions WHERE token=? AND expires>?',[hash,now])).rows.length;},
    async deleteSession(hash){await query('DELETE FROM admin_sessions WHERE token=?',[hash]);},
    async loginAttempt(key,now){return (await query('INSERT INTO login_attempts(ip,count,until) VALUES(?,1,?) ON CONFLICT(ip) DO UPDATE SET count=CASE WHEN until<=? THEN 1 ELSE count+1 END,until=CASE WHEN until<=? THEN excluded.until ELSE until END RETURNING count',[key,now+60000,now,now])).rows[0].count;},
    async clearAttempts(key){await query('DELETE FROM login_attempts WHERE ip=?',[key]);}
  };
}
