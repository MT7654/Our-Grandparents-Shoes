"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { 
  ArrowLeft, 
  Loader2, 
  Users, 
  Shield, 
  Search,
  RefreshCw,
  UserCircle,
  Calendar,
  Clock,
  TrendingUp,
  Lock,
  LogOut
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface User {
  id: string
  email: string
  full_name: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at?: string
  sessions_completed?: number
  average_score?: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  
  // Login form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    checkAuthStatus()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(
        users.filter(
          (user) =>
            user.email.toLowerCase().includes(query) ||
            user.full_name.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, users])

  async function checkAuthStatus() {
    try {
      setIsLoading(true)
      setError(null)
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIsLoggedIn(false)
        setIsLoading(false)
        return
      }
      
      setIsLoggedIn(true)
      setCurrentUser(user)
      
      // Check admin status and fetch users
      await fetchAdminData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsLoading(false)
    }
  }

  async function fetchAdminData() {
    try {
      const response = await fetch("/api/admin/users")
      
      if (!response.ok) {
        const data = await response.json()
        if (response.status === 403) {
          setIsAdmin(false)
          setError("Access denied. You must be an admin to view this page.")
          setIsLoading(false)
          return
        }
        throw new Error(data.error || "Failed to fetch users")
      }
      
      const data = await response.json()
      setIsAdmin(true)
      setUsers(data.users || [])
      setFilteredUsers(data.users || [])
      if (data.message) {
        setMessage(data.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError(null)
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        setLoginError(error.message)
        setIsLoggingIn(false)
        return
      }
      
      if (data.user) {
        setCurrentUser(data.user)
        setIsLoggedIn(true)
        await fetchAdminData()
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setIsAdmin(false)
    setCurrentUser(null)
    setUsers([])
    setEmail("")
    setPassword("")
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function getTimeSince(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-purple-200">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  // Admin Login Form (not logged in)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-purple-500/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-purple-400" />
            </div>
            <CardTitle className="text-2xl text-white">Admin Portal</CardTitle>
            <CardDescription className="text-purple-300/70">
              Sign in with your admin credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-purple-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-700/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus:border-purple-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-purple-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-700/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus:border-purple-400"
                />
              </div>
              
              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{loginError}</p>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Sign In as Admin
                  </>
                )}
              </Button>
            </form>
            
            <div className="mt-6 pt-4 border-t border-purple-500/20">
              <Link href="/">
                <Button variant="ghost" className="w-full text-purple-300 hover:text-white hover:bg-purple-800/30">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Access Denied (logged in but not admin)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-red-500/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <CardTitle className="text-2xl text-white">Access Denied</CardTitle>
            <CardDescription className="text-slate-400">
              {error || "Your account doesn't have admin privileges."}
            </CardDescription>
            {currentUser && (
              <p className="text-sm text-purple-300/50 mt-2">
                Logged in as: {currentUser.email}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-800/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out & Try Different Account
            </Button>
            <Link href="/">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <Link href="/">
                <Button variant="ghost" className="text-purple-300 hover:text-white hover:bg-purple-800/30">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Button 
                onClick={handleLogout}
                variant="ghost" 
                className="text-purple-300 hover:text-white hover:bg-purple-800/30"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                  <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
                </div>
                <p className="text-lg text-purple-200/70">
                  Manage users and monitor training progress
                </p>
                {currentUser && (
                  <p className="text-sm text-purple-300/50 mt-1">
                    Logged in as: {currentUser.email}
                  </p>
                )}
              </div>
              <Button 
                onClick={() => { setIsLoading(true); fetchAdminData(); }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-purple-300">Total Users</CardDescription>
                <CardTitle className="text-3xl text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-400" />
                  {users.length}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-purple-300">Active Today</CardDescription>
                <CardTitle className="text-3xl text-white flex items-center gap-2">
                  <Clock className="w-6 h-6 text-green-400" />
                  {users.filter(u => u.last_sign_in_at && 
                    new Date(u.last_sign_in_at).toDateString() === new Date().toDateString()
                  ).length}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-purple-300">New This Week</CardDescription>
                <CardTitle className="text-3xl text-white flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-400" />
                  {users.filter(u => {
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return new Date(u.created_at) > weekAgo
                  }).length}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-purple-300">Avg. Score</CardDescription>
                <CardTitle className="text-3xl text-white flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-yellow-400" />
                  {users.length > 0 && users.some(u => u.average_score)
                    ? Math.round(users.reduce((acc, u) => acc + (u.average_score || 0), 0) / users.filter(u => u.average_score).length)
                    : "N/A"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Message Banner */}
          {message && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-200 text-sm">ℹ️ {message}</p>
            </div>
          )}

          {/* Users Table */}
          <Card className="bg-slate-800/50 border-purple-500/20 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    All Users
                  </CardTitle>
                  <CardDescription className="text-purple-300/70">
                    {filteredUsers.length} of {users.length} users shown
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus:border-purple-400"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-purple-500/20 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-purple-500/20 hover:bg-purple-500/5">
                      <TableHead className="text-purple-300">User</TableHead>
                      <TableHead className="text-purple-300">Email</TableHead>
                      <TableHead className="text-purple-300">Joined</TableHead>
                      <TableHead className="text-purple-300">Last Active</TableHead>
                      <TableHead className="text-purple-300">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-purple-300/70">
                          {searchQuery ? "No users match your search" : "No users found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow 
                          key={user.id} 
                          className="border-purple-500/20 hover:bg-purple-500/10 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <UserCircle className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-white">{user.full_name}</p>
                                <p className="text-xs text-purple-300/50 font-mono">{user.id.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-purple-200">{user.email}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-purple-200">{getTimeSince(user.created_at)}</p>
                              <p className="text-xs text-purple-300/50">{formatDate(user.created_at)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.last_sign_in_at ? (
                              <div>
                                <Badge 
                                  variant="outline" 
                                  className={`${
                                    new Date(user.last_sign_in_at).toDateString() === new Date().toDateString()
                                      ? "border-green-500/50 text-green-400"
                                      : "border-purple-500/50 text-purple-300"
                                  }`}
                                >
                                  {getTimeSince(user.last_sign_in_at)}
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="outline" className="border-slate-500/50 text-slate-400">
                                Never
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.sessions_completed !== undefined && user.sessions_completed > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="text-purple-200">{user.sessions_completed} sessions</span>
                                {user.average_score !== undefined && user.average_score > 0 && (
                                  <Badge className="bg-purple-500/20 text-purple-300 border-0">
                                    Avg: {user.average_score}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-purple-300/50">No sessions yet</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
