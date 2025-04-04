import { ReactNode } from "react"

type FormWrapperProps = {
  children: ReactNode
}

export function FormWrapper({ children }: FormWrapperProps) {
  return (
    <div className="flex-1 overflow-auto bg-slate-800 rounded-lg shadow-sm">
      <div className="flex flex-col gap-3 p-4">
        {children}
      </div>
    </div>
  )
}