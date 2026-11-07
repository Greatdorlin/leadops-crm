import {resolvePublicAppOrigin} from "@/lib/public-app-origin";

/** Trust the configured public origin rather than proxy-internal URLs or client-supplied forwarded headers. */
export function isSameWorkspaceOrigin(request:Request,environment:Readonly<Record<string,string|undefined>>=process.env){
  const supplied=request.headers.get("origin");
  if(!supplied)return false;
  try{
    const parsed=new URL(supplied);
    if(parsed.origin!==supplied||parsed.username||parsed.password)return false;
    const expected=resolvePublicAppOrigin(environment)||new URL(request.url).origin;
    return supplied===expected;
  }catch{return false}
}
