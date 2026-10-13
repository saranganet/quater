import { NextRequest, NextResponse } from "next/server";
import { fetchCourtCauseList, CauseListQueryParams } from "@/lib/ecourts/cause-list";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const state = url.searchParams.get("state") || "MH";
    const district = url.searchParams.get("district") || "Thane";
    const courtComplex =
      url.searchParams.get("courtComplex") ||
      "Civil Court Junior Division & JMFC, Ambernath";
    const judgeQuery = url.searchParams.get("judge") || undefined;
    const advocateQuery = url.searchParams.get("advocate") || undefined;
    const date = url.searchParams.get("date") || undefined;
    const category = (url.searchParams.get("category") || "ALL") as
      | "ALL"
      | "CIVIL"
      | "CRIMINAL";

    const params: CauseListQueryParams = {
      state,
      district,
      courtComplex,
      judgeQuery,
      advocateQuery,
      date,
      category,
    };

    const result = await fetchCourtCauseList(params);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[GET /api/ecourts/cause-list] Error fetching cause list:", error);
    return NextResponse.json(
      { error: "Failed to fetch eCourts daily cause list", details: error.message },
      { status: 500 }
    );
  }
}
