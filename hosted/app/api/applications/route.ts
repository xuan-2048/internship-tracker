import { handleApplications } from "../../application-api";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return handleApplications(request); }
export async function POST(request: Request) { return handleApplications(request); }
