"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Bell, Plus, Trash2, TrendingDown, TrendingUp, AlertCircle, Check } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { searchItems } from "@/lib/items"
import { ALL_CITIES } from "@/lib/aodp-client"
import type { Alert, City } from "@/lib/types"

export function AlertManager() {
  const { alerts, addAlert, removeAlert, toggleAlert } = useAppStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [triggeredAlerts, setTriggeredAlerts] = useState<Set<string>>(new Set())

  // New alert form
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState("none")
  const [alertType, setAlertType] = useState<Alert["type"]>("price_drop")
  const [threshold, setThreshold] = useState(10000)
  const [selectedCity, setSelectedCity] = useState<string>("all")

  useEffect(() => {
    if (searchQuery.length > 1) {
      const results = searchItems(searchQuery)
      setSearchResults(results.slice(0, 10))
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const handleCreateAlert = () => {
    if (!selectedItem || selectedItem === "none") return

    addAlert({
      item_id: selectedItem,
      city: selectedCity !== "all" ? (selectedCity as City) : undefined,
      type: alertType,
      threshold: threshold,
      enabled: true,
    })

    // Reset form
    setSelectedItem("none")
    setSearchQuery("")
    setAlertType("price_drop")
    setThreshold(10000)
    setSelectedCity("all")
    setIsDialogOpen(false)
  }

  const handleSelectItem = (itemId: string) => {
    setSelectedItem(itemId)
    setSearchResults([])
  }

  const getAlertTypeLabel = (type: Alert["type"]) => {
    switch (type) {
      case "price_drop":
        return "Price Drop"
      case "profit_spike":
        return "Profit Spike"
      case "crafting_gain":
        return "Crafting Gain"
      case "flip_margin":
        return "Flip Margin"
      case "refining_profit":
        return "Refining Profit"
    }
  }

  const getAlertTypeIcon = (type: Alert["type"]) => {
    switch (type) {
      case "price_drop":
        return <TrendingDown className="h-4 w-4" />
      case "profit_spike":
        return <TrendingUp className="h-4 w-4" />
      case "crafting_gain":
        return <TrendingUp className="h-4 w-4" />
      case "flip_margin":
        return <TrendingUp className="h-4 w-4" />
      case "refining_profit":
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const getItemName = (itemId: string) => {
    const results = searchItems(itemId)
    return results.length > 0 ? results[0].name : itemId
  }

  return (
    <div className="space-y-6">
      {triggeredAlerts.size > 0 && (
        <Card className="bg-primary/10 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary animate-pulse" />
              Active Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(triggeredAlerts).map((alertId) => {
                const alert = alerts.find((a) => a.id === alertId)
                if (!alert) return null

                return (
                  <div key={alertId} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">{getItemName(alert.item_id)}</div>
                        <div className="text-sm text-muted-foreground">
                          {getAlertTypeLabel(alert.type)} threshold reached
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newSet = new Set(triggeredAlerts)
                        newSet.delete(alertId)
                        setTriggeredAlerts(newSet)
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Alerts</CardTitle>
              <CardDescription>
                {alerts.length} {alerts.length === 1 ? "alert" : "alerts"} configured
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Alert
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Alert</DialogTitle>
                  <DialogDescription>Set up a custom alert for market opportunities</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Item</Label>
                    <div className="relative">
                      <Input
                        placeholder="Search for items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchResults.length > 0 && (
                        <Card className="absolute z-10 w-full mt-2">
                          <CardContent className="p-2">
                            <div className="space-y-1">
                              {searchResults.map((item) => (
                                <Button
                                  key={item.id}
                                  variant="ghost"
                                  className="w-full justify-start"
                                  onClick={() => {
                                    handleSelectItem(item.id)
                                    setSearchQuery(item.name)
                                  }}
                                >
                                  <Badge variant="outline" className="mr-2">
                                    T{item.tier}
                                  </Badge>
                                  <span>{item.name}</span>
                                </Button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    {selectedItem && selectedItem !== "none" && (
                      <p className="text-sm text-muted-foreground">Selected: {getItemName(selectedItem)}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Alert Type</Label>
                    <Select value={alertType} onValueChange={(v) => setAlertType(v as Alert["type"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price_drop">Price Drop Below</SelectItem>
                        <SelectItem value="profit_spike">Profit Spike Above</SelectItem>
                        <SelectItem value="crafting_gain">Crafting Gain Above</SelectItem>
                        <SelectItem value="flip_margin">Flip Margin Above</SelectItem>
                        <SelectItem value="refining_profit">Refining Profit Above</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Threshold (silver)</Label>
                    <Input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
                  </div>

                  <div className="space-y-2">
                    <Label>City (Optional)</Label>
                    <Select value={selectedCity} onValueChange={(v) => setSelectedCity(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All cities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cities</SelectItem>
                        {ALL_CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAlert} disabled={!selectedItem || selectedItem === "none"}>
                    Create Alert
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No alerts configured</h3>
              <p className="text-muted-foreground mb-4">
                Create your first alert to get notified about market opportunities
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{getItemName(alert.item_id)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getAlertTypeIcon(alert.type)}
                          <span>{getAlertTypeLabel(alert.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{alert.threshold.toLocaleString()} silver</TableCell>
                      <TableCell>
                        {alert.city ? (
                          <Badge variant="outline">{alert.city}</Badge>
                        ) : (
                          <span className="text-muted-foreground">All</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={alert.enabled} onCheckedChange={() => toggleAlert(alert.id)} />
                          <span className="text-sm text-muted-foreground">{alert.enabled ? "Active" : "Paused"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeAlert(alert.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How Alerts Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Alerts are stored locally in your browser using localStorage. They persist between sessions but are
            client-side only.
          </p>
          <Separator />
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Alert Types:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Price Drop:</strong> Notifies when item price falls below threshold
              </li>
              <li>
                <strong>Profit Spike:</strong> Notifies when profit margin exceeds threshold
              </li>
              <li>
                <strong>Crafting Gain:</strong> Notifies when crafting profit reaches threshold
              </li>
              <li>
                <strong>Flip Margin:</strong> Notifies when flipping spread exceeds threshold
              </li>
              <li>
                <strong>Refining Profit:</strong> Notifies when refining profit exceeds threshold
              </li>
            </ul>
          </div>
          <Separator />
          <p>
            <strong>Note:</strong> Alerts are checked when you visit the respective tool pages (Market Tracker, Crafting
            Calculator, etc.). They do not push notifications in the background.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
