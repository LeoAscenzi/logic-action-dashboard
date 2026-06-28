import { NextRequest, NextResponse } from "next/server";

export default function middleware(req: NextRequest) {
	if (!req.cookies.has("refresh_token")) {
		const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
		return NextResponse.redirect(`${siteUrl}/community`);
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard/:path*"],
};
