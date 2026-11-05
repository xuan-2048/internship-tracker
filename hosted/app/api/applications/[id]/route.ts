import { handleApplications } from "../../../application-api";
export const dynamic = "force-dynamic";
type Context = {params: Promise<{id:string}>};
export async function PUT(request: Request, context: Context) {
  return handleApplications(request, (await context.params).id);
}
export async function DELETE(request: Request, context: Context) {
  return handleApplications(request, (await context.params).id);
}
