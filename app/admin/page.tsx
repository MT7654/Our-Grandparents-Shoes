"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Trash2, X } from "lucide-react"

interface User {
  id: string
  email: string
  dateJoined: string
  totalConversations: number
  lastLoggedIn: string
}

const initialUsers: User[] = [
  {
    id: "1",
    email: "alice@example.com",
    dateJoined: "2025-01-10",
    totalConversations: 12,
    lastLoggedIn: "2025-01-28",
  },
  {
    id: "2",
    email: "bob@example.com",
    dateJoined: "2025-01-15",
    totalConversations: 7,
    lastLoggedIn: "2025-01-27",
  },
  {
    id: "3",
    email: "carol@example.com",
    dateJoined: "2025-01-18",
    totalConversations: 3,
    lastLoggedIn: "2025-01-25",
  },
  {
    id: "4",
    email: "dave@example.com",
    dateJoined: "2025-01-20",
    totalConversations: 0,
    lastLoggedIn: "2025-01-20",
  },
  {
    id: "5",
    email: "admin@email.com",
    dateJoined: "2025-01-01",
    totalConversations: 25,
    lastLoggedIn: "2025-01-28",
  },
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const handleDelete = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    setDeleteTarget(null)
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 bg-transparent text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
              <p className="text-sm text-gray-600 mt-1">User management</p>
            </div>
            <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
              {users.length} {users.length === 1 ? "user" : "users"}
            </Badge>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_110px_80px_110px_60px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wide">
            <span>Email</span>
            <span>Date Joined</span>
            <span className="text-center">Convos</span>
            <span>Last Login</span>
            <span />
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-100">
            {users.map((user) => (
              <div
                key={user.id}
                className="sm:grid sm:grid-cols-[1fr_110px_80px_110px_60px] sm:items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                {/* Mobile: stacked layout / Desktop: grid */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {user.email}
                  </span>
                  {user.email === "admin@email.com" && (
                    <Badge className="bg-gray-200 text-gray-700 border-0 text-xs px-1.5 py-0">
                      Admin
                    </Badge>
                  )}
                </div>

                <span className="text-sm text-gray-600 max-sm:hidden">
                  {formatDate(user.dateJoined)}
                </span>

                <span className="text-sm text-gray-600 text-center max-sm:hidden">
                  {user.totalConversations}
                </span>

                <span className="text-sm text-gray-600 max-sm:hidden">
                  {formatDate(user.lastLoggedIn)}
                </span>

                {/* Mobile meta row */}
                <div className="flex items-center gap-3 mt-1 sm:hidden text-xs text-gray-500">
                  <span>Joined {formatDate(user.dateJoined)}</span>
                  <span>{user.totalConversations} convos</span>
                  <span>Last login {formatDate(user.lastLoggedIn)}</span>
                </div>

                {/* Delete button */}
                <div className="flex justify-end max-sm:mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-gray-400 hover:text-red-600 hover:bg-red-50 bg-transparent"
                    onClick={() => setDeleteTarget(user)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-gray-500">
              No users found.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Delete Account</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 bg-transparent"
                onClick={() => setDeleteTarget(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-1">
              Are you sure you want to delete the account for:
            </p>
            <p className="text-sm font-semibold text-gray-900 mb-6">{deleteTarget.email}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-transparent border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleDelete(deleteTarget.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
