import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2, Phone, Search, Shield,
  Flame, Ambulance, Hospital, Building2, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useHotlines, useCreateHotline, useUpdateHotline, useDeleteHotline } from '@/hooks/useHotlines'
import type { EmergencyHotline } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Agency name required'),
  phone_number: z.string().min(3, 'Phone number required'),
  category: z.enum(['POLICE', 'FIRE', 'AMBULANCE', 'HOSPITAL', 'BARANGAY']),
  description: z.string().optional(),
  priority: z.number().min(1).max(99).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  is_local: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const CATEGORY_META = {
  POLICE: { icon: Shield, color: '#9B59B6', label: 'Police' },
  FIRE: { icon: Flame, color: '#FF6B35', label: 'Fire' },
  AMBULANCE: { icon: Ambulance, color: '#E74C3C', label: 'Ambulance' },
  HOSPITAL: { icon: Hospital, color: '#4A90D9', label: 'Hospital' },
  BARANGAY: { icon: Building2, color: '#2E8B47', label: 'Barangay' },
} as const

export default function EmergencyHotlines() {
  const { data: hotlines = [], isLoading } = useHotlines()
  const createMutation = useCreateHotline()
  const updateMutation = useUpdateHotline()
  const deleteMutation = useDeleteHotline()

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EmergencyHotline | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<EmergencyHotline | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'ACTIVE', is_local: true, category: 'BARANGAY' },
  })

  const filteredHotlines = hotlines.filter(h => {
    const matchSearch =
      !search ||
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.phone_number.includes(search)
    const matchCat = filterCategory === 'ALL' || h.category === filterCategory
    return matchSearch && matchCat
  })

  const grouped = Object.entries(CATEGORY_META).map(([cat, meta]) => ({
    category: cat,
    meta,
    items: filteredHotlines.filter(h => h.category === cat),
  })).filter(g => filterCategory === 'ALL' ? true : g.category === filterCategory)

  const openCreate = () => {
    setEditTarget(null)
    reset({ status: 'ACTIVE', is_local: true, category: 'BARANGAY' })
    setFormOpen(true)
  }

  const openEdit = (hotline: EmergencyHotline) => {
    setEditTarget(hotline)
    reset({
      name: hotline.name,
      phone_number: hotline.phone_number,
      category: hotline.category as FormValues['category'],
      description: hotline.description ?? '',
      priority: hotline.priority ?? 1,
      status: (hotline.status ?? 'ACTIVE') as FormValues['status'],
      is_local: hotline.is_local,
    })
    setFormOpen(true)
  }

  const onSubmit = async (data: FormValues) => {
    if (editTarget) {
      await updateMutation.mutateAsync({ id: editTarget.id, ...data })
    } else {
      await createMutation.mutateAsync(data as Omit<EmergencyHotline, 'id' | 'created_at'>)
    }
    setFormOpen(false)
    reset()
  }

  const onDelete = async () => {
    if (deleteConfirm) {
      await deleteMutation.mutateAsync(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="page-title">Emergency Hotlines</h2>
          <p className="page-subtitle">
            Manage emergency contacts visible in the resident mobile application
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Add Hotline
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hotlines..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="sm:w-44"
            >
              <option value="ALL">All Categories</option>
              {Object.entries(CATEGORY_META).map(([cat, { label }]) => (
                <option key={cat} value={cat}>{label}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Hotlines by Category */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, meta, items }) => {
            if (!items.length && filterCategory !== 'ALL') return null
            const Icon = meta.icon
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${meta.color}18` }}
                  >
                    <Icon className="w-4 h-4" color={meta.color} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-9">No hotlines in this category</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map(hotline => (
                      <HotlineCard
                        key={hotline.id}
                        hotline={hotline}
                        meta={meta}
                        onEdit={openEdit}
                        onDelete={setDeleteConfirm}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {filteredHotlines.length === 0 && (
            <div className="py-16 text-center">
              <Phone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hotlines found</p>
              <Button variant="outline" onClick={openCreate} className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Hotline
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Hotline' : 'Add New Hotline'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Agency Name *</Label>
              <Input id="name" placeholder="e.g. Barangay 178 Police" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone_number">Phone Number *</Label>
              <Input id="phone_number" placeholder="e.g. (02) 8961-1050 or 911" {...register('phone_number')} />
              {errors.phone_number && <p className="text-xs text-destructive">{errors.phone_number.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category *</Label>
                <Select id="category" {...register('category')}>
                  {Object.entries(CATEGORY_META).map(([cat, { label }]) => (
                    <option key={cat} value={cat}>{label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select id="status" {...register('status')}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" placeholder="Optional description" {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="priority">Display Priority</Label>
                <Input id="priority" type="number" min={1} max={99} placeholder="1" {...register('priority', { valueAsNumber: true })} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="is_local" {...register('is_local')} className="w-4 h-4 accent-primary" />
                <Label htmlFor="is_local">Local Hotline</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editTarget ? 'Save Changes' : 'Add Hotline'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Hotline</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?
            This will remove it from the resident mobile application.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function HotlineCard({
  hotline,
  meta,
  onEdit,
  onDelete,
}: {
  hotline: EmergencyHotline
  meta: { color: string }
  onEdit: (h: EmergencyHotline) => void
  onDelete: (h: EmergencyHotline) => void
}) {
  return (
    <div className="stat-card group relative">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {hotline.is_local && (
              <Star className="w-3 h-3 fill-current text-accent flex-shrink-0" />
            )}
            <p className="text-sm font-semibold text-foreground truncate">{hotline.name}</p>
          </div>
          <div className="flex items-center gap-1.5 text-primary font-mono text-sm font-bold">
            <Phone className="w-3.5 h-3.5" />
            {hotline.phone_number}
          </div>
          {hotline.description && (
            <p className="text-xs text-muted-foreground mt-1.5">{hotline.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={hotline.status === 'INACTIVE' ? 'status-resolved' : 'status-broadcasted'}>
              {hotline.status ?? 'ACTIVE'}
            </span>
            {hotline.is_local && (
              <span className="text-[10px] font-semibold text-muted-foreground">LOCAL</span>
            )}
          </div>
        </div>
      </div>
      <div className="absolute top-3 right-3 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(hotline)}
          aria-label="Edit hotline"
          className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(hotline)}
          aria-label="Delete hotline"
          className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
