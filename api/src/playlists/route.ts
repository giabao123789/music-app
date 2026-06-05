import "server-only";
const BACKEND=(process.env.BACKEND_URL||"http://127.0.0.1:3001").replace(/\/+$/,"");
const USER_ID=process.env.USER_ID;

export async function GET(){
  if(!USER_ID) return Response.json([], {status:200});
  try{
    const r=await fetch(`${BACKEND}/users/${USER_ID}/playlists`,{cache:"no-store"});
    const data=await r.json().catch(()=>[]);
    return Response.json(Array.isArray(data)?data:[],{status:r.status});
  }catch{ return Response.json([], {status:500});}
}

export async function POST(req:Request){
  if(!USER_ID) return Response.json({error:"USER_ID is missing"},{status:400});
  const body=await req.json(); // {name}
  const r=await fetch(`${BACKEND}/users/${USER_ID}/playlists`,{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)
  });
  return new Response(await r.text(),{status:r.status,headers:{"content-type":"application/json"}});
}
