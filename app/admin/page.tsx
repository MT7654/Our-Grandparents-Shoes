"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Users, MessageCircle, TrendingUp, LogOut, BarChart3 } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"

// Mock data types (will be replaced with real data from API later)
interface Volunteer {
  id: string
  name: string
  email: string
  sessionsCompleted: number
  averageScore: number
  completionRate: number
  joinedAt: string
  lastActive: string
}

interface Chat {
  id: string
  personaName: string
  objective: string
  performanceData: { tries: number; averageScore: number }[]
}

// Mock data (frontend only for now)
const mockVolunteers: Volunteer[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    sessionsCompleted: 12,
    averageScore: 85,
    completionRate: 92,
    joinedAt: "2024-01-15T10:00:00Z",
    lastActive: "2024-12-10T14:30:00Z",
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "michael.chen@example.com",
    sessionsCompleted: 8,
    averageScore: 92,
    completionRate: 88,
    joinedAt: "2024-02-20T09:00:00Z",
    lastActive: "2024-12-11T16:20:00Z",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@example.com",
    sessionsCompleted: 5,
    averageScore: 78,
    completionRate: 75,
    joinedAt: "2024-03-10T11:00:00Z",
    lastActive: "2024-11-28T10:15:00Z",
  },
  {
    id: "4",
    name: "David Kim",
    email: "david.kim@example.com",
    sessionsCompleted: 15,
    averageScore: 88,
    completionRate: 95,
    joinedAt: "2024-01-05T08:00:00Z",
    lastActive: "2024-12-11T18:45:00Z",
  },
]

const SCORE_THRESHOLD = 80 // Threshold for high-performing volunteers
const TOTAL_CHATS_AVAILABLE = 8 // Total number of chat templates available

const mockChats: Chat[] = [
  {
    id: "1",
    personaName: "Margaret",
    objective: "Discuss gardening tips",
    performanceData: [
      { tries: 1, averageScore: 65 },
      { tries: 2, averageScore: 72 },
      { tries: 3, averageScore: 80 },
      { tries: 4, averageScore: 85 },
    ],
  },
  {
    id: "2",
    personaName: "Robert",
    objective: "Share family stories",
    performanceData: [
      { tries: 1, averageScore: 70 },
      { tries: 2, averageScore: 78 },
      { tries: 3, averageScore: 82 },
    ],
  },
  {
    id: "3",
    personaName: "Eleanor",
    objective: "Talk about favorite recipes",
    performanceData: [
      { tries: 1, averageScore: 68 },
      { tries: 2, averageScore: 75 },
      { tries: 3, averageScore: 83 },
      { tries: 4, averageScore: 88 },
      { tries: 5, averageScore: 90 },
    ],
  },
  {
    id: "4",
    personaName: "William",
    objective: "Discuss hobbies",
    performanceData: [
      { tries: 1, averageScore: 72 },
      { tries: 2, averageScore: 80 },
      { tries: 3, averageScore: 85 },
      { tries: 4, averageScore: 87 },
    ],
  },
  {
    id: "5",
    personaName: "Dorothy",
    objective: "Plan a day trip",
    performanceData: [
      { tries: 1, averageScore: 60 },
      { tries: 2, averageScore: 70 },
    ],
  },
  {
    id: "6",
    personaName: "Frank",
    objective: "Learn about technology",
    performanceData: [
      { tries: 1, averageScore: 75 },
      { tries: 2, averageScore: 82 },
      { tries: 3, averageScore: 86 },
    ],
  },
]

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [volunteers] = useState<Volunteer[]>(mockVolunteers)
  const [chats] = useState<Chat[]>(mockChats)

  // Calculate statistics
  const totalVolunteers = volunteers.length
  const highPerformingVolunteers = volunteers.filter((v) => v.averageScore >= SCORE_THRESHOLD).length

  // Logout handler
  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to logout")
      }
      router.push("/")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to logout"
      toast({
        title: "Error logging out",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy")
    } catch {
      return "N/A"
    }
  }

  const chartConfig = {
    score: {
      label: "Average Score",
      color: "hsl(var(--chart-1))",
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-xl text-muted-foreground">
              Track volunteers and monitor conversation sessions
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Volunteers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVolunteers}</div>
              <p className="text-xs text-muted-foreground">
                in total
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High-Performing Volunteers</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{highPerformingVolunteers}</div>
              <p className="text-xs text-muted-foreground">
                Score ≥ {SCORE_THRESHOLD}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{TOTAL_CHATS_AVAILABLE}</div>
              <p className="text-xs text-muted-foreground">
                Chat templates available
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="volunteers" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="volunteers">
              <Users className="w-4 h-4 mr-2" />
              Volunteers
            </TabsTrigger>
            <TabsTrigger value="chats">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chats
            </TabsTrigger>
          </TabsList>

          {/* Volunteers Tab */}
          <TabsContent value="volunteers" className="space-y-4">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Volunteers</CardTitle>
                <CardDescription>
                  View and track all registered volunteers and their progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Average Score</TableHead>
                      <TableHead>Completion Rate</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {volunteers.map((volunteer) => (
                      <TableRow key={volunteer.id}>
                        <TableCell className="font-medium">{volunteer.name}</TableCell>
                        <TableCell className="text-muted-foreground">{volunteer.email}</TableCell>
                        <TableCell>{volunteer.sessionsCompleted}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{volunteer.averageScore}%</span>
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${volunteer.averageScore}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{volunteer.completionRate}%</span>
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${volunteer.completionRate}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(volunteer.joinedAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(volunteer.lastActive)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chats Tab */}
          <TabsContent value="chats" className="space-y-4">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Chat Statistics</CardTitle>
                <CardDescription>
                  View performance metrics for each chat template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead>Objective</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chats.map((chat) => (
                      <Dialog key={chat.id}>
                        <TableRow>
                          <TableCell className="font-medium">{chat.personaName}</TableCell>
                          <TableCell className="max-w-xs">{chat.objective}</TableCell>
                          <TableCell className="text-right">
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-2">
                                <BarChart3 className="h-4 w-4" />
                                View Progress Chart
                              </Button>
                            </DialogTrigger>
                          </TableCell>
                        </TableRow>
                        <DialogContent className="sm:max-w-[600px]">
                          <DialogHeader>
                            <DialogTitle>
                              {chat.personaName} - {chat.objective}
                            </DialogTitle>
                            <DialogDescription>
                              Average score of all volunteers against number of tries
                            </DialogDescription>
                          </DialogHeader>
                          <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <LineChart accessibilityLayer data={chat.performanceData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis
                                dataKey="tries"
                                tickLine={true}
                                axisLine={true}
                                tickMargin={8}
                                tickFormatter={(value) => `Try ${value}`}
                                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                              />
                              <YAxis
                                tickLine={true}
                                axisLine={true}
                                tickMargin={8}
                                domain={[0, 100]}
                                tickFormatter={(value) => `${value}%`}
                                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                              />
                              <ChartTooltip
                                cursor={false}
                                content={
                                  <ChartTooltipContent
                                    indicator="dot"
                                    formatter={(value) => [`${value}%`, "Average Score"]}
                                  />
                                }
                              />
                              <Line
                                type="linear"
                                dataKey="averageScore"
                                stroke="hsl(var(--chart-1))"
                                strokeWidth={2}
                                dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
                                activeDot={{ r: 6, fill: "hsl(var(--chart-1))" }}
                                connectNulls={true}
                              />
                            </LineChart>
                          </ChartContainer>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

