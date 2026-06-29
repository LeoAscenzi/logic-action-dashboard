import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
	if (!req.cookies.has("refresh_token")) {
		const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ivybridgesociety.com";
		return NextResponse.redirect(`${siteUrl}/community`);
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard/:path*"],
};
