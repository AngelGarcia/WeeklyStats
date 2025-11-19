"use client";

import React, { useContext, useState } from 'react';
import { AppContext } from '@/app/context/AppContext';
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { Member } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MemberManagementPage() {
  const { members, addMember, updateMember, deleteMember, isInitialized } = useContext(AppContext);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formState, setFormState] = useState({ name: '', presenterCount: 0, volunteerCount: 0, topicPresenterCount: 0 });

  if (!isInitialized) {
    return <div className="flex justify-center items-center h-full"><p>Cargando datos de miembros...</p></div>;
  }

  const openDialogForNew = () => {
    setEditingMember(null);
    setFormState({ name: '', presenterCount: 0, volunteerCount: 0, topicPresenterCount: 0 });
    setIsDialogOpen(true);
  };

  const openDialogForEdit = (member: Member) => {
    setEditingMember(member);
    setFormState({ name: member.name, presenterCount: member.presenterCount, volunteerCount: member.volunteerCount, topicPresenterCount: member.topicPresenterCount });
    setIsDialogOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormState(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || 0 : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      updateMember({ ...editingMember, ...formState });
    } else {
      addMember({ name: formState.name, presenterCount: formState.presenterCount, volunteerCount: formState.volunteerCount, topicPresenterCount: formState.topicPresenterCount });
    }
    setIsDialogOpen(false);
  };

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
                <TableHead>Miembro</TableHead>
                <TableHead className="text-center">Reuniones Lideradas</TableHead>
                <TableHead className="text-center">Secretario</TableHead>
                <TableHead className="text-center">Temas Liderados</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {members.map(member => (
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
                    <TableCell className="text-center">{member.topicPresenterCount}</TableCell>
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
        <DialogContent>
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
