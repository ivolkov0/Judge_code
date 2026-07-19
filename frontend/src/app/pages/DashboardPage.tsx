import React from "react"
import { useAuth } from "../context/AuthContext"
import { OrganizerDashboard } from "./dashboards/OrganizerDashboard"
import { JuryDashboard } from "./dashboards/JuryDashboard"
import { ParticipantHome } from "./dashboards/ParticipantHome"

export function DashboardPage() {
  const { role } = useAuth()

  if (role === "organizer") {
    return <OrganizerDashboard />
  }

  if (role === "jury") {
    return <JuryDashboard />
  }

  return <ParticipantHome />
}
