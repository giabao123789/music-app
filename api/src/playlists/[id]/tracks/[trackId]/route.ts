import "server-only";
const BACKEND=(process.env.BACKEND_URL||"http://127.0.0.1:3001").replace(/\/+$/,"");

export async function DELETE(_:Request,{params}:{params:{id:string;trackId:string}}){
  const r=await fetch(`${BACKEND}/playlists/${params.id}/tracks/${params.trackId}`,{method:"DELETE"});
  return new Response(await r.text(),{status:r.status,headers:{"content-type":"application/json"}});
}
