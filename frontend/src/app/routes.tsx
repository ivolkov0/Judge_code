import { createBrowserRouter } from "react-router"
import { AppLayout } from "./components/Layout"
import { LandingPage } from "./pages/LandingPage"
import { DashboardPage } from "./pages/DashboardPage"
import { TeamPage } from "./pages/TeamPage"
import { TeamSubmissionPage } from "./pages/TeamSubmissionPage"
import { LeaderboardPage } from "./pages/LeaderboardPage"
import { SettingsPage } from "./pages/SettingsPage"
import { ProfilePage } from "./pages/ProfilePage"
import { LoginPage } from "./pages/LoginPage"
import { RegisterPage } from "./pages/RegisterPage"
import { OrganizerTeamsPage } from "./pages/OrganizerTeamsPage"
import { AlgoPage } from "./pages/AlgoPage"
import { AlgoProblemPage } from "./pages/AlgoProblemPage"
import { ManagePage } from "./pages/ManagePage"
import { TeamReviewPage } from "./pages/TeamReviewPage"

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
  {
    path: "/",
    Component: AppLayout,
    children: [
      { path: "dashboard", Component: DashboardPage },
      { path: "team", Component: TeamPage },
      { path: "teams", Component: OrganizerTeamsPage },
      { path: "submission", Component: TeamSubmissionPage },
      { path: "leaderboard", Component: LeaderboardPage },
      { path: "profile", Component: ProfilePage },
      { path: "settings", Component: SettingsPage },
      { path: "algo", Component: AlgoPage },
      { path: "algo/:id", Component: AlgoProblemPage },
      { path: "manage", Component: ManagePage },
      { path: "review/:id", Component: TeamReviewPage },
    ],
  },
])
