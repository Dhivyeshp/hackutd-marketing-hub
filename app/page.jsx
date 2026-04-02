// Middleware redirects / → /dashboard (lead) or /my-tasks (member)
// This page renders briefly during that redirect
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-foreground" />
    </div>
  )
}
