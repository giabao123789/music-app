import "server-only";
const BACKEND=(process.env.BACKEND_URL||"http://127.0.0.1:3001").replace(/\/+$/,"");

export async function GET(_:Request,{params}:{params:{id:string}}){
  try{
    const r=await fetch(`${BACKEND}/playlists/${params.id}`,{cache:"no-store"});
    const data=await r.json().catch(()=>null);
    return Response.json(data,{status:r.status});
  }catch(e){ return Response.json({error:String(e)},{status:500});}
}
