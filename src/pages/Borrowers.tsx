import { useForm } from '@tanstack/react-form'
import { Edit, Eye, MapPin, Phone, Plus, RefreshCw, Search, Trash2, User } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useCreateBorrower,
  useDeleteBorrower,
  useGetBorrowers,
  useUpdateBorrower,
} from '@/hooks/api/useBorrowers'
import { formatDate } from '@/lib/utils'
import { type BorrowerFormData, borrowerSchema } from '@/lib/validation'
import type { Borrower } from '@/types/api/borrowers'

export default function Borrowers() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null)

  // Use our new hooks
  const {
    data: borrowers = [],
    isLoading: loading,
    error,
    refetch: refetchBorrowers,
  } = useGetBorrowers()
  const createBorrowerMutation = useCreateBorrower()
  const updateBorrowerMutation = useUpdateBorrower()
  const deleteBorrowerMutation = useDeleteBorrower()

  const createForm = useForm({
    defaultValues: {
      name: '',
      phone: '',
      address: '',
    } as BorrowerFormData,
    validators: {
      onBlur: borrowerSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createBorrowerMutation.mutateAsync(value)
        setIsAddDialogOpen(false)
        createForm.reset()
      } catch (error) {
        console.error('Failed to create borrower:', error)
      }
    },
  })

  const editForm = useForm({
    defaultValues: {
      name: '',
      phone: '',
      address: '',
    } as BorrowerFormData,
    validators: {
      onBlur: borrowerSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        if (editingBorrower) {
          await updateBorrowerMutation.mutateAsync({ id: editingBorrower.id, data: value })
          setIsEditDialogOpen(false)
          setEditingBorrower(null)
          editForm.reset()
        }
      } catch (error) {
        console.error('Failed to update borrower:', error)
      }
    },
  })

  const handleEdit = (borrower: Borrower) => {
    setEditingBorrower(borrower)
    editForm.setFieldValue('name', borrower.name)
    editForm.setFieldValue('phone', borrower.phone || '')
    editForm.setFieldValue('address', borrower.address || '')
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this borrower?')) {
      try {
        await deleteBorrowerMutation.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete borrower:', error)
      }
    }
  }

  const filteredBorrowers = borrowers.filter(
    (borrower) =>
      borrower.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (borrower.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading borrowers...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-red-600">Failed to load borrowers: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Borrowers</h1>
          <p className="text-gray-600 mt-2">Manage your borrowers</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Borrower
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Borrower</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                createForm.handleSubmit()
              }}
              className="space-y-4"
            >
              <createForm.Field name="name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="add-name">Name *</Label>
                    <Input
                      id="add-name"
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </createForm.Field>

              <createForm.Field name="phone">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="add-phone">Phone</Label>
                    <Input
                      id="add-phone"
                      type="tel"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </createForm.Field>

              <createForm.Field name="address">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="add-address">Address</Label>
                    <Input
                      id="add-address"
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </createForm.Field>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    createForm.reset()
                    setIsAddDialogOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <createForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <Button type="submit" disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Borrower'}
                    </Button>
                  )}
                </createForm.Subscribe>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Borrowers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Borrowers ({filteredBorrowers.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetchBorrowers()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBorrowers.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No borrowers found</p>
              <p className="text-sm text-gray-400">
                {searchTerm
                  ? 'Try adjusting your search'
                  : 'Add your first borrower to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBorrowers.map((borrower) => (
                  <TableRow key={borrower.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{borrower.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {borrower.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-gray-400" />
                          {borrower.phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {borrower.address && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {borrower.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(borrower.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/borrowers/${borrower.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(borrower)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(borrower.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Borrower</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              editForm.handleSubmit()
            }}
            className="space-y-4"
          >
            <editForm.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                  )}
                </div>
              )}
            </editForm.Field>

            <editForm.Field name="phone">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    type="tel"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                  )}
                </div>
              )}
            </editForm.Field>

            <editForm.Field name="address">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    type="text"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                  )}
                </div>
              )}
            </editForm.Field>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  editForm.reset()
                  setIsEditDialogOpen(false)
                  setEditingBorrower(null)
                }}
              >
                Cancel
              </Button>
              <editForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? 'Updating...' : 'Update Borrower'}
                  </Button>
                )}
              </editForm.Subscribe>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
