"use client";

import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/app/context/AppContext';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import type { Member } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

type SortKey = keyof Omit<Member, 'id' | 'avatarUrl'>;
type SortDirection = 'asc' | 'desc';

export default function MemberManagementPage() {
  const { members, addMember, updateMember, deleteMember, isInitialized } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formState, setFormState] = useState({ name: '', presenterCount: 0, volunteerCount: 0, topicPresenterCount: 0, avatarUrl: '' });
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'asc' });

  const sortedMembers = useMemo(() => {
    let sortableMembers = [...members];
    if (sortConfig !== null) {
      sortableMembers.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableMembers;
  }, [members, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  if (!isInitialized) {
    return <div className="flex justify-center items-center h-full"><p>Cargando datos de miembros...</p></div>;
  }

  const openDialogForNew = () => {
    setEditingMember(null);
    const newAvatarIndex = members.length % PlaceHolderImages.length;
    setFormState({ name: '', presenterCount: 0, volunteerCount: 0, topicPresenterCount: 0, avatarUrl: PlaceHolderImages[newAvatarIndex].imageUrl });
    setIsDialogOpen(true);
  };

  const openDialogForEdit = (member: Member) => {
    setEditingMember(member);
    setFormState({ name: member.name, presenterCount: member.presenterCount, volunteerCount: member.volunteerCount, topicPresenterCount: member.topicPresenterCount || 0, avatarUrl: member.avatarUrl });
    setIsDialogOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormState(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || 0 : value }));
  };
  
  const handleAvatarChange = (imageUrl: string) => {
    setFormState(prev => ({ ...prev, avatarUrl: imageUrl }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      updateMember({ ...editingMember, ...formState });
    } else {
      addMember({ name: formState.name, avatarUrl: formState.avatarUrl });
    }
    setIsDialogOpen(false);
  };
  
  const renderSortableHeader = (key: SortKey, label: string, className: string = "") => (
    <TableHead className={cn("cursor-pointer", className)} onClick={() => requestSort(key)}>
      <div className="flex items-center gap-2">
        {label}
        {sortConfig.key === key 
          ? <span className="text-xs">{getSortIndicator(key)}</span>
          : <ArrowUpDown className="h-3 w-3 opacity-50" />
        }
      </div>
    </TableHead>
  );

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-headline text-2xl">Gestión de Miembros</CardTitle>
            <Button onClick={openDialogForNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Miembro
            </Button>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                  {renderSortableHeader('name', 'Miembro')}
                  {renderSortableHeader('presenterCount', 'Reuniones Lideradas', 'text-center')}
                  {renderSortableHeader('volunteerCount', 'Secretario', 'text-center')}
                  {renderSortableHeader('topicPresenterCount', 'Temas Liderados', 'text-center')}
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedMembers.map(member => (
                <TableRow key={member.id}>
                    <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar>
                        <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.name}</span>
                    </div>
                    </TableCell>
                    <TableCell className="text-center">{member.presenterCount}</TableCell>
                    <TableCell className="text-center">{member.volunteerCount}</TableCell>
                    <TableCell className="text-center">{member.topicPresenterCount || 0}</TableCell>
                    <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openDialogForEdit(member)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente al miembro <strong>{member.name}</strong>.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMember(member.id)}>Eliminar</AlertDialogAction>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Editar Miembro' : 'Añadir Miembro'}</DialogTitle>
            <DialogDescription>
              {editingMember ? `Actualiza los detalles de ${editingMember.name}.` : 'Añade un nuevo miembro al equipo.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" value={formState.name} onChange={handleFormChange} required />
            </div>

            <div className="space-y-2">
                <Label>Avatar</Label>
                <ScrollArea className="h-40 w-full">
                  <div className="grid grid-cols-5 gap-2 pr-4">
                      {PlaceHolderImages.map(image => (
                          <button type="button" key={image.id} onClick={() => handleAvatarChange(image.imageUrl)} className={cn("rounded-full overflow-hidden border-2 transition-all", formState.avatarUrl === image.imageUrl ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-primary/50")}>
                            <Image src={image.imageUrl} alt={image.description} width={64} height={64} className="h-16 w-16 object-cover" data-ai-hint={image.imageHint} />
                          </button>
                      ))}
                  </div>
                </ScrollArea>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="presenterCount">Reuniones lideradas</Label>
                <Input id="presenterCount" name="presenterCount" type="number" value={formState.presenterCount} onChange={handleFormChange} />
                </div>
                <div className="space-y-2">
                <Label htmlFor="volunteerCount">Veces de secretario</Label>
                <Input id="volunteerCount" name="volunteerCount" type="number" value={formState.volunteerCount} onChange={handleFormChange} />
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="topicPresenterCount">Temas Liderados</Label>
                <Input id="topicPresenterCount" name="topicPresenterCount" type="number" value={formState.topicPresenterCount} onChange={handleFormChange} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingMember ? 'Guardar Cambios' : 'Añadir Miembro'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
