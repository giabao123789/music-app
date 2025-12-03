import "server-only";
const BACKEND=(process.env.BACKEND_URL||"http://127.0.0.1:3001").replace(/\/+$/,"");

export async function GET(){
  try{
    const r=await fetch(`${BACKEND}/tracks`,{cache:"no-store"});
    const body=await r.text();
    return new Response(body,{status:r.status,headers:{"content-type":r.headers.get("content-type")??"application/json"}});
  }catch(e){
    return Response.json({error:"BACKEND_UNREACHABLE",detail:String(e),target:`${BACKEND}/tracks`},{status:502});
  }
}
