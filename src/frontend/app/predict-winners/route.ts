import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("images").filter((v): v is File => v instanceof File);

    // Validate that exactly 2 or 4 images were uploaded.
    if (files.length !== 2 && files.length !== 4) {
      return NextResponse.json(
        { error: "Exactly 2 or 4 images are required." },
        { status: 400 }
      );
    }

    // Forward the request to the Python backend for processing.
    const backendResponse = await fetch(`${BACKEND_API_URL}/predict-winners`, {
      method: "POST",
      body: formData,
      // Note: 'Content-Type' header is set automatically by fetch() for FormData.
    });

    // If the backend returns an error, forward it to the client.
    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json(errorData, { status: backendResponse.status });
    }

    // The backend returns an array of winner card URLs.
    const winnerUrls: (string | null)[] = await backendResponse.json();

    // Transform the array into a structured object for the client.
    const result = {
      winner1_card_url: winnerUrls[0] || null,
      winner2_card_url: winnerUrls[1] || null, // Gracefully handles cases with only one winner.
      count: winnerUrls.length, // The number of winners returned.
    };

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}