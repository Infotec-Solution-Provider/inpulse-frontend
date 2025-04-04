import { ReactNode } from "react"

type FieldWrapperProps = {
  children: ReactNode
}

export function FieldWrapper({ children }: FieldWrapperProps) {
  return (
    <div className="flex justify-between gap-3 w-full">
      {children}
    </div>
  )
}