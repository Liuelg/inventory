import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { getProductImageUrl } from "@/features/products/utils"

interface ProductImageCellProps {
  image?: string
  altName?: string
}

export function ProductImageCell({ image, altName = "Product image" }: ProductImageCellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const src = getProductImageUrl(image)

  if (!src) {
    return (
      <div className="h-10 w-10 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">
        No img
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="cursor-zoom-in block"
      >
        <img
          src={src}
          alt={altName}
          className="h-10 w-10 rounded-md object-cover border"
        />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">{altName}</DialogTitle>
          <img
            src={src}
            alt={altName}
            className="w-full h-auto max-h-[80vh] object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
