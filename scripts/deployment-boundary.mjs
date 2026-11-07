function targetsLogin(value,base){
  try{const url=new URL(value,base);return url.origin===new URL(base).origin&&url.pathname==='/login'}catch{return false}
}
export function isProtectedLoginRedirect(status,location,html,base){
  if([302,303,307,308].includes(status))return targetsLogin(location||'',base)&&!!location;
  if(status!==200)return false;
  // Next.js can emit a framework redirect after a Suspense stream has started.
  const meta=html.match(/<meta\b[^>]*\bid=["']__next-page-redirect["'][^>]*>/i)?.[0];
  if(!meta||!/http-equiv=["']refresh["']/i.test(meta))return false;
  const value=meta.match(/content=["']\d+;url=([^"']+)["']/i)?.[1];
  return !!value&&targetsLogin(value.replaceAll('&amp;','&'),base);
}
