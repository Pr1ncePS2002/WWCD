export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const images = formData.getAll("images").filter((v) => v instanceof Blob) as Blob[]

    if (images.length !== 4) {
      return new Response(JSON.stringify({ error: "Exactly 4 images are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Simulate processing for demo
    await new Promise((r) => setTimeout(r, 1200))

    return new Response(
      JSON.stringify({
        winner1_card_url: "/placeholder.svg?height=640&width=480",
        winner2_card_url: "/placeholder.svg?height=640&width=480",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  } catch {
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
