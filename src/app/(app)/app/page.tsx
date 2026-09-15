import { redirect } from 'next/navigation'

// The old Dashboard tab (6 event cards + "view all") was merged into the
// Events page — /app now lands directly on /app/events.
export default function AppDashboardPage() {
  redirect('/app/events')
}
