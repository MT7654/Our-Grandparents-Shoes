"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import Link from "next/link"
import { Users, MessageCircle, TrendingUp, LogOut, BarChart3, Search, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import LoadingOverlay from "@/components/loading-overlay"
import { ChatData, Filters } from "@/lib/types/types"
import type { Database } from "@/supabase/types"

type Volunteer = Database['public']['Views']['statistics_by_volunteers']['Row']
const HIGH_PERFORMING_THRESHOLD = 80

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // Admin Dashboard Details
  const [volunteerNum, setVolunteerNum] = useState<number>(0)
  const [chatNum, setChatNum] = useState<number>(0)
  const [highPerformNum, setHighPerformNum] = useState<number>(0)
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [chats, setChats] = useState<ChatData[]>([])

  // User Changeable Variables
  const [tab, setTab] = useState<"volunteers" | "chats">("volunteers")
  const [limit, setLimit] = useState<number>(10)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filters, setFilters] = useState<Filters>({
    volunteer_name: "",
    persona_name: "",
  })

  // Loading State
  const [loading, setLoading] = useState<boolean>(true)

  // Update filters when search query changes
  useEffect(() => {
    setFilters({
      volunteer_name: tab === "volunteers" ? searchQuery : "",
      persona_name: tab === "chats" ? searchQuery : "",
    })
  }, [searchQuery, tab])

  useEffect(() => {
    setLoading(true)

    const getData = async () => {
      try {
        const data = await fetch("/api/admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            limit,
            highPerformingThreshold:HIGH_PERFORMING_THRESHOLD,
            filters,
          }),
        })

        if (!data.ok) {
          const errorData = await data.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to load admin data (${data.status})`)
        }

        const { 
          totalVolunteers, 
          totalChats, 
          highPerformingVolunteers, 
          volunteerDetails, 
          chatProgressWithAverageScores 
        } = await data.json()

        setVolunteerNum(totalVolunteers || 0)
        setChatNum(totalChats || 0)
        setHighPerformNum(highPerformingVolunteers || 0)
        setVolunteers(sortVolunteersByLastActive(volunteerDetails || []))
        setChats(chatProgressWithAverageScores || [])
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load admin data"
        console.error("Load error: " + error)

        toast({
          title: "Error loading admin data",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    getData()
  }, [limit, filters])

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

  // Delete user handler
  async function handleDeleteUser(userId: string) {
    try {
      setLoading(true)
      const response = await fetch("/api/admin", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete user")
      }

      toast({
        title: "User deleted",
        description: "The user has been successfully removed.",
      })

      // Refresh data to show updated list
      const data = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit,
          highPerformingThreshold: HIGH_PERFORMING_THRESHOLD,
          filters,
        }),
      })

      if (data.ok) {
        const {
          totalVolunteers,
          totalChats,
          highPerformingVolunteers,
          volunteerDetails,
          chatProgressWithAverageScores,
        } = await data.json()

        setVolunteerNum(totalVolunteers || 0)
        setChatNum(totalChats || 0)
        setHighPerformNum(highPerformingVolunteers || 0)
        setVolunteers(sortVolunteersByLastActive(volunteerDetails || []))
        setChats(chatProgressWithAverageScores || [])
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete user"
      toast({
        title: "Error deleting user",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "MMM d, yyyy")
    } catch {
      return "N/A"
    }
  }

  const isInactiveForTwoWeeks = (lastActive: string | null | undefined) => {
    if (!lastActive) return true // Consider null as inactive
    try {
      const lastActiveDate = new Date(lastActive)
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      return lastActiveDate < twoWeeksAgo
    } catch {
      return true
    }
  }

  const sortVolunteersByLastActive = (volunteers: Volunteer[]) => {
    return [...volunteers].sort((a, b) => {
      // Handle null values - push them to the end
      if (!a.last_active && !b.last_active) return 0
      if (!a.last_active) return 1
      if (!b.last_active) return -1
      
      // Sort by date, most recent first
      return new Date(b.last_active).getTime() - new Date(a.last_active).getTime()
    })
  }

  const chartConfig = {
    score: {
      label: "Average Score",
      color: "var(--chart-1)",
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <LoadingOverlay isLoading={loading} />
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
              <div className="text-2xl font-bold">{volunteerNum}</div>
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
              <div className="text-2xl font-bold">{highPerformNum}</div>
              <p className="text-xs text-muted-foreground">
                Score ≥ {HIGH_PERFORMING_THRESHOLD}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{chatNum}</div>
              <p className="text-xs text-muted-foreground">
                Chat templates available
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="volunteers" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="volunteers" onClick={() => setTab("volunteers")}>
              <Users className="w-4 h-4 mr-2" />
              Volunteers
            </TabsTrigger>
            <TabsTrigger value="chats" onClick={() => setTab("chats")}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Chats
            </TabsTrigger>
          </TabsList>

          {/* Search and Limit Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by volunteer name or persona name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="limit-select" className="text-sm text-muted-foreground whitespace-nowrap">
                Limit:
              </label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(Number(value))}>
                <SelectTrigger id="limit-select" className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {volunteers.map((volunteer) => (
                      <TableRow 
                        key={volunteer.uid}
                        className={isInactiveForTwoWeeks(volunteer.last_active) ? "bg-red-50 hover:bg-red-100" : ""}
                      >
                        <TableCell className="font-medium">
                          <Link href={`/admin/volunteer/${volunteer.uid}`} className="text-primary hover:underline">
                            {volunteer.full_name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{volunteer.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(volunteer.created_at!)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(volunteer.last_active)}
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this user {volunteer.full_name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => handleDeleteUser(volunteer.uid!)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
                      <Dialog key={chat.cid}>
                        <TableRow>
                          <TableCell className="font-medium">{chat.persona_name}</TableCell>
                          <TableCell className="max-w-xs">{chat.chat_objective}</TableCell>
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
                              {chat.persona_name} - {chat.chat_objective}
                            </DialogTitle>
                            <DialogDescription>
                              Average score of all volunteers against number of tries
                            </DialogDescription>
                          </DialogHeader>
                          <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <LineChart accessibilityLayer data={chat.triesAgainstScore} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                                stroke="var(--chart-1)"
                                strokeWidth={2}
                                dot={{ fill: "var(--chart-1)", r: 4 }}
                                activeDot={{ r: 6, fill: "var(--chart-1)" }}
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

