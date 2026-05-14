import { useEffect } from "react"
import { deriveTitle, routeDestination, updatePearlBox } from "@/lib/updatePearlBox"

interface SaveToNotionProps {
  content: string
}

export default function SaveToNotion({ content }: SaveToNotionProps) {
  useEffect(() => {
    async function save() {
      if (!content) return

      // Only persist intentional memory commits
      if (content.includes("Update Pearl Box:")) {
        try {
          await updatePearlBox({
            title: deriveTitle(content),
            content,
            destination: routeDestination(content),
            sourceThread: "chat",
          })
          console.log("Saved to Notion")
        } catch (error) {
          console.error("Notion save failed:", error)
        }
      }
    }

    void save()
  }, [content])

  return null
}
