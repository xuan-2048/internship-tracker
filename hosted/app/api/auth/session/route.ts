import { currentUser } from "../../../auth-provider";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await currentUser();
  return Response.json(user ? {email:user.email} : {error:"Please sign in to continue."}, {status:user?200:401,headers:{"Cache-Control":"no-store"}});
}
