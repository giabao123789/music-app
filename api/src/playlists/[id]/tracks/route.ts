import "server-only";
const BACKEND=(process.env.BACKEND_URL||"http://127.0.0.1:3001").replace(/\/+$/,"");

export async function POST(req:Request,{params}:{params:{id:string}}){
  const body=await req.json(); // {trackId}
  const r=await fetch(`${BACKEND}/playlists/${params.id}/tracks`,{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)
  });
  return new Response(await r.text(),{status:r.status,headers:{"content-type":"application/json"}});
}
