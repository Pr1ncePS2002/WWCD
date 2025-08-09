export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("images").filter((v): v is File => v instanceof File)

    const count = files.length
    if (count !== 2 && count !== 4) {
      return new Response(JSON.stringify({ error: "Exactly 2 or 4 images are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    await new Promise((r) => setTimeout(r, 1200))

    return new Response(
      JSON.stringify({
        winner1_card_url: "/placeholder.svg?height=640&width=480",
        winner2_card_url: count === 4 ? "/placeholder.svg?height=640&width=480" : null,
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
