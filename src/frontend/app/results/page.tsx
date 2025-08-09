"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FlipCard } from "@/components/flip-card"
import { WinnerTemplate } from "@/components/winner-template"

type ResultStored = { winner1_card_url?: string; winner2_card_url?: string; count?: number }

export default function ResultsPage() {
  const [result, setResult] = useState<ResultStored | null>(null)
  const router = useRouter()

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("alfahm-winners")
      if (raw) setResult(JSON.parse(raw) as ResultStored)
    } catch {
      // ignore
    }
  }, [])

  const count = result?.count === 2 ? 2 : 4

  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">{"Winners"}</h1>
          <div className="mx-auto mt-3 h-1 w-40 rounded-full bg-orange-500/90" />
          <p className="mt-3 text-white/70">
            {count === 2 ? "Tap to flip and reveal the winner!" : "Tap a card to flip and reveal the winners!"}
          </p>
        </header>

        {!result ? (
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-white/85 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)]">
            <p>{"No results found. Please run prediction again."}</p>
            <div className="mt-4">
              <Button onClick={() => router.push("/")} className="bg-orange-600 hover:bg-orange-500 text-white">
                {"Go back"}
              </Button>
            </div>
          </div>
        ) : (
          <section className="mt-10">
            <div className={`grid grid-cols-1 gap-6 ${count === 4 ? "sm:grid-cols-2" : ""}`}>
              <FlipCard
                ariaLabel="Flip to reveal Winner 1"
                autoFlipDelayMs={900}
                className="border-white/10 bg-white/[0.04]"
                front={
                  <WinnerTemplate
                    title="Winner 1"
                    subtitle="Tap to reveal"
                    showImage={false}
                    className="border-white/10 bg-white/[0.04]"
                  />
                }
                back={
                  <WinnerTemplate
                    title="Winner 1"
                    subtitle="Chest Piece Champion"
                    imageUrl={result.winner1_card_url || "/placeholder.svg?height=640&width=480"}
                    className="border-white/10 bg-white/[0.04]"
                  />
                }
              />

              {count === 4 && (
                <FlipCard
                  ariaLabel="Flip to reveal Winner 2"
                  autoFlipDelayMs={1300}
                  className="border-white/10 bg-white/[0.04]"
                  front={
                    <WinnerTemplate
                      title="Winner 2"
                      subtitle="Tap to reveal"
                      showImage={false}
                      className="border-white/10 bg-white/[0.04]"
                    />
                  }
                  back={
                    <WinnerTemplate
                      title="Winner 2"
                      subtitle="Chest Piece Champion"
                      imageUrl={result.winner2_card_url || "/placeholder.svg?height=640&width=480"}
                      className="border-white/10 bg-white/[0.04]"
                    />
                  }
                />
              )}
            </div>

            <div className="mt-10 flex justify-center gap-3">
              <Button
                onClick={() => router.push("/")}
                variant="outline"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                {"Predict Again"}
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
