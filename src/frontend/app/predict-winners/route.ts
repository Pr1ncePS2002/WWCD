// route.ts
import { NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("images").filter((v): v is File => v instanceof File);
    const count = files.length;

    if (count !== 2 && count !== 4) {
      return NextResponse.json({ error: "Exactly 2 or 4 images are required." }, { status: 400 });
    }

    // --- Logic for 4 images: Call the real FastAPI backend ---
    if (count === 4) {
      try {
        const backendResponse = await fetch(`${BACKEND_API_URL}/predict-winners`, {
          method: "POST",
          body: formData,
        });

        if (!backendResponse.ok) {
          const errorData = await backendResponse.json();
          return NextResponse.json(errorData, { status: backendResponse.status });
        }

        const data = await backendResponse.json();

        // The FastAPI backend returns a JSON object, so we use its keys directly
        const result = {
          winner1_card_url: data.winner1_card_url || null,
          winner2_card_url: data.winner2_card_url || null,
          winner1_score: data.winner1_score,
          winner2_score: data.winner2_score,
          count: count,
        };

        return NextResponse.json(result, { status: 200 });
      } catch (error) {
        console.error("Backend fetch error:", error);
        return NextResponse.json({ error: "Backend error" }, { status: 500 });
      }
    }

    // --- Mock response for 2 images ---
    // This logic remains the same, but with a consistent JSON format
    await new Promise((r) => setTimeout(r, 1200));

    return NextResponse.json({
      winner1_card_url: "/placeholder.svg?height=640&width=480",
      winner2_card_url: null,
      winner1_score: "92.5", // Mock score
      winner2_score: null,    // Mock score
      count: 2,
    }, { status: 200 });
  } catch (error) {
    console.error("Internal error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}