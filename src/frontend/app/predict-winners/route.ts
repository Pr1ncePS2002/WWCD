const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("images").filter((v): v is File => v instanceof File);

    const count = files.length;
    if (count !== 2 && count !== 4) {
      return new Response(
        JSON.stringify({ error: "Exactly 2 or 4 images are required." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (count === 4) {
      // Forward to FastAPI backend for real prediction
      try {
        const backendResponse = await fetch(`${BACKEND_API_URL}/predict-winners`, {
          method: "POST",
          body: formData,
        });

        if (!backendResponse.ok) {
          const errorData = await backendResponse.json();
          return new Response(JSON.stringify(errorData), {
            status: backendResponse.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        const data = await backendResponse.json(); // data is an array of URLs

        // Transform array to object with expected keys
        const result = {
          winner1_card_url: data[0] || null,
          winner2_card_url: data.length === 4 ? data[1] || null : null,
          count: data.length,
        };

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Backend fetch error:", error);
        return new Response(
          JSON.stringify({ error: "Backend error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Mock response for 2 images
    await new Promise((r) => setTimeout(r, 1200));

    return new Response(
      JSON.stringify({
        winner1_card_url: "/placeholder.svg?height=640&width=480",
        winner2_card_url: null,
        count: 2,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Internal error:", error);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
