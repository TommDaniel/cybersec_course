import { NextResponse } from "next/server";
import { openapiSpec } from "@/lib/openapi";

// Endpoint que serve o JSON OpenAPI consumido pelo Swagger UI em /docs.
export async function GET() {
  return NextResponse.json(openapiSpec);
}
